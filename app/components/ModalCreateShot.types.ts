import { UserWithRole } from "../../lib/roleUtils";

export interface ModalCreateShotProps {
  open: boolean;
  section: number | null;
  onClose: () => void;
  user: UserWithRole | null;
}
