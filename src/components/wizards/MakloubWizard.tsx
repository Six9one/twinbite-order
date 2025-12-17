import { UnifiedProductWizard } from '@/components/wizards/UnifiedProductWizard';

interface MakloubWizardProps {
    onClose: () => void;
}

export function MakloubWizard({ onClose }: MakloubWizardProps) {
    return <UnifiedProductWizard productType="makloub" onClose={onClose} />;
}
