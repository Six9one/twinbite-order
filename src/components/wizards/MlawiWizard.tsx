import { UnifiedProductWizard } from '@/components/wizards/UnifiedProductWizard';

interface MlawiWizardProps {
    onClose: () => void;
}

export function MlawiWizard({ onClose }: MlawiWizardProps) {
    return <UnifiedProductWizard productType="mlawi" onClose={onClose} />;
}
