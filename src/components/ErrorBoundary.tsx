import React, { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCcw } from "lucide-react";

interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false
    };

    public static getDerivedStateFromError(error: Error): State {
        // Update state so the next render will show the fallback UI.
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    private handleReset = () => {
        this.setState({ hasError: false });
        window.location.href = "/";
    };

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-background p-4">
                    <div className="max-w-md w-full text-center space-y-6 animate-in fade-in zoom-in duration-300">
                        <div className="flex justify-center">
                            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
                                <AlertTriangle className="w-10 h-10 text-red-600" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <h1 className="text-2xl font-bold">Oups ! Quelque chose s'est mal passé.</h1>
                            <p className="text-muted-foreground">
                                Une erreur inattendue est survenue. Nous nous excusons pour ce désagrément.
                            </p>
                        </div>

                        <div className="bg-muted p-4 rounded-lg text-left overflow-auto max-h-40 text-xs font-mono">
                            <p className="font-bold text-red-600 mb-1">Erreur:</p>
                            {this.state.error?.message || "Erreur inconnue"}
                        </div>

                        <Button
                            onClick={this.handleReset}
                            className="w-full gap-2 py-6 text-lg"
                        >
                            <RefreshCcw className="w-5 h-5" />
                            Recharger la page
                        </Button>

                        <p className="text-sm text-muted-foreground">
                            Si le problème persiste, merci de nous contacter.
                        </p>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
