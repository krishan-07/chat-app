export type AlertColor =
  | "primary"
  | "secondary"
  | "success"
  | "danger"
  | "warning"
  | "info"
  | "light"
  | "dark";

export interface AlertInterface {
  id: number;
  message: string;
  variant: AlertColor;
}
