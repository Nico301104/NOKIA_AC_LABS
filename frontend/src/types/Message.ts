export interface Message {
  role: string;
  text: string;
  timestamp: Date;
  isWelcome?: boolean;
}