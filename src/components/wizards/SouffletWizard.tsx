import { UnifiedProductWizard } from '@/components/wizards/UnifiedProductWizard';

interface SouffletWizardProps {
    onClose: () => void;
}

export function SouffletWizard({ onClose }: SouffletWizardProps) {
    return <UnifiedProductWizard productType="soufflet" onClose={onClose} />;
}
