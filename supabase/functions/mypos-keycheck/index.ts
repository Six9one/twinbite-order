import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import crypto from "node:crypto";
import { Buffer } from "node:buffer";

/**
 * TEMPORARY DIAGNOSTIC — delete once the myPOS signature issue is resolved.
 *
 * Answers one question: is MYPOS_PUBLIC_KEY the myPOS notification-signing certificate,
 * or is it just the public half of our own MYPOS_PRIVATE_KEY? If it is our own key, webhook
 * signature verification can never succeed, because myPOS signs with *their* private key.
 *
 * Reports structural properties only. No key material, and no derived value that could be
 * used to reconstruct key material, is ever returned or logged.
 *
 * Deployed WITH JWT verification (the default) so it is not publicly reachable.
 */

function normalizePem(raw: string, kind: "PUBLIC KEY" | "PRIVATE KEY"): string {
  if (!raw) return "";
  const formatted = raw.replace(/\\n/g, "\n").replace(/\r/g, "").trim();
  if (formatted.includes("-----BEGIN")) return formatted;
  const lines = formatted.replace(/\s+/g, "").match(/.{1,64}/g) || [formatted];
  return `-----BEGIN ${kind}-----\n${lines.join("\n")}\n-----END ${kind}-----`;
}

function pemHeader(raw: string): string {
  const match = raw.replace(/\\n/g, "\n").match(/-----BEGIN [A-Z0-9 ]+-----/);
  return match ? match[0] : "(no PEM header found)";
}

serve(async () => {
  const rawPublic = Deno.env.get("MYPOS_PUBLIC_KEY") || "";
  const rawPrivate = Deno.env.get("MYPOS_PRIVATE_KEY") || "";

  const report: Record<string, unknown> = {
    publicKey: {
      isSet: Boolean(rawPublic),
      length: rawPublic.length,
      header: pemHeader(rawPublic),
      hasLiteralBackslashN: rawPublic.includes("\\n"),
      hasRealNewlines: rawPublic.includes("\n"),
    },
    privateKey: {
      isSet: Boolean(rawPrivate),
      length: rawPrivate.length,
      header: pemHeader(rawPrivate),
      hasLiteralBackslashN: rawPrivate.includes("\\n"),
    },
  };

  // Decode the PEM body and compare the DER's self-declared length against the bytes we
  // actually have. An X.509 certificate starts 0x30 0x82 <len-hi> <len-lo>, so a truncated
  // value shows up here exactly, and by how many bytes.
  try {
    const body = rawPublic
      .replace(/\\n/g, "\n")
      .replace(/-----(BEGIN|END)[A-Z0-9 ]+-----/g, "")
      .replace(/\s+/g, "");
    const der = Buffer.from(body, "base64");
    const declared = der.length >= 4 && der[0] === 0x30 && der[1] === 0x82
      ? (der[2] << 8 | der[3]) + 4
      : null;
    (report.publicKey as Record<string, unknown>).der = {
      base64BodyChars: body.length,
      actualBytes: der.length,
      declaredBytes: declared,
      truncatedByBytes: declared !== null ? declared - der.length : null,
      startsWithSequenceTag: der[0] === 0x30,
    };
  } catch (err) {
    (report.publicKey as Record<string, unknown>).derError =
      err instanceof Error ? err.message : String(err);
  }

  // Walk the DER's top-level children. An X.509 certificate is SEQUENCE{SEQUENCE tbs,
  // SEQUENCE algid, BIT STRING sig}; a bare SPKI public key is SEQUENCE{SEQUENCE algid,
  // BIT STRING key}. The shape tells us which one is really stored, regardless of the
  // PEM header text wrapped around it.
  try {
    const body = rawPublic
      .replace(/\\n/g, "\n")
      .replace(/-----(BEGIN|END)[A-Z0-9 ]+-----/g, "")
      .replace(/\s+/g, "");
    const der = Buffer.from(body, "base64");

    const readLen = (buf: Buffer, at: number): [number, number] => {
      const first = buf[at];
      if (first < 0x80) return [first, at + 1];
      const count = first & 0x7f;
      let len = 0;
      for (let i = 0; i < count; i++) len = (len << 8) | buf[at + 1 + i];
      return [len, at + 1 + count];
    };

    const [, contentStart] = readLen(der, 1);
    const children: Array<{ tag: string; bytes: number }> = [];
    let cursor = contentStart;
    while (cursor < der.length && children.length < 8) {
      const tag = der[cursor];
      const [len, next] = readLen(der, cursor + 1);
      children.push({ tag: `0x${tag.toString(16)}`, bytes: len });
      cursor = next + len;
    }

    // Try Web Crypto (fully implemented in Deno, unlike node:crypto's X.509 surface) on the
    // whole DER and on each SEQUENCE inside it, so we find the usable public key either way.
    const tryImport = async (bytes: Uint8Array) => {
      try {
        const k = await globalThis.crypto.subtle.importKey(
          "spki",
          bytes,
          { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
          true,
          ["verify"]
        );
        return (k.algorithm as RsaHashedKeyAlgorithm).modulusLength;
      } catch {
        return null;
      }
    };

    const wholeAsSpki = await tryImport(new Uint8Array(der));
    (report.publicKey as Record<string, unknown>).structure = {
      topLevelChildren: children,
      looksLikeCertificate: children.length === 3,
      looksLikeSpki: children.length === 2,
      importsAsSpkiDirectly: wholeAsSpki !== null,
      spkiModulusBits: wholeAsSpki,
    };
  } catch (err) {
    (report.publicKey as Record<string, unknown>).structureError =
      err instanceof Error ? err.message : String(err);
  }

  let publicKey: ReturnType<typeof crypto.createPublicKey> | null = null;
  let privateKey: ReturnType<typeof crypto.createPrivateKey> | null = null;

  try {
    publicKey = crypto.createPublicKey(normalizePem(rawPublic, "PUBLIC KEY"));
    (report.publicKey as Record<string, unknown>).parses = true;
    (report.publicKey as Record<string, unknown>).type = publicKey.asymmetricKeyType;
    (report.publicKey as Record<string, unknown>).modulusBits =
      publicKey.asymmetricKeyDetails?.modulusLength ?? null;
  } catch (err) {
    (report.publicKey as Record<string, unknown>).parses = false;
    (report.publicKey as Record<string, unknown>).parseError =
      err instanceof Error ? err.message : String(err);
  }

  // If it is an X.509 certificate, the subject/issuer names say outright whose key it is.
  if (rawPublic.includes("CERTIFICATE")) {
    try {
      const cert = new crypto.X509Certificate(normalizePem(rawPublic, "PUBLIC KEY"));
      (report.publicKey as Record<string, unknown>).certificate = {
        subject: cert.subject,
        issuer: cert.issuer,
        validTo: cert.validTo,
      };
    } catch (err) {
      (report.publicKey as Record<string, unknown>).certificateError =
        err instanceof Error ? err.message : String(err);
    }
  }

  try {
    privateKey = crypto.createPrivateKey(normalizePem(rawPrivate, "PRIVATE KEY"));
    (report.privateKey as Record<string, unknown>).parses = true;
    (report.privateKey as Record<string, unknown>).type = privateKey.asymmetricKeyType;
    (report.privateKey as Record<string, unknown>).modulusBits =
      privateKey.asymmetricKeyDetails?.modulusLength ?? null;
  } catch (err) {
    (report.privateKey as Record<string, unknown>).parses = false;
    (report.privateKey as Record<string, unknown>).parseError =
      err instanceof Error ? err.message : String(err);
  }

  // The decisive test: sign a fixed probe with our private key and try to verify it with
  // MYPOS_PUBLIC_KEY. Success means the two are one keypair — i.e. MYPOS_PUBLIC_KEY is OURS,
  // and is therefore the wrong key for verifying myPOS-originated notifications.
  if (publicKey && privateKey) {
    try {
      const probe = Buffer.from("mypos-keycheck-probe", "utf-8");
      const signer = crypto.createSign("RSA-SHA256");
      signer.update(probe);
      const sig = signer.sign(privateKey);

      const verifier = crypto.createVerify("RSA-SHA256");
      verifier.update(probe);
      report.publicKeyIsOurOwnKeypair = verifier.verify(publicKey, sig);
    } catch (err) {
      report.pairCheckError = err instanceof Error ? err.message : String(err);
    }
  }

  report.verdict = report.publicKeyIsOurOwnKeypair === true
    ? "MYPOS_PUBLIC_KEY is the public half of MYPOS_PRIVATE_KEY (our own keypair). Webhook verification can NEVER succeed — replace it with the myPOS notification-signing certificate from the merchant portal."
    : report.publicKeyIsOurOwnKeypair === false
    ? "MYPOS_PUBLIC_KEY is a DIFFERENT key from our keypair, which is what we want. If verification still fails, the mismatch is in the signed-payload construction, not the key."
    : "Could not complete the pair check — see parse errors above.";

  return new Response(JSON.stringify(report, null, 2), {
    headers: { "Content-Type": "application/json" },
    status: 200,
  });
});
