import { UnifiedProductWizard } from '@/components/wizards/UnifiedProductWizard';

interface PaniniWizardProps {
  onClose: () => void;
}

export function PaniniWizard({ onClose }: PaniniWizardProps) {
  return <UnifiedProductWizard productType="panini" onClose={onClose} />;
}
