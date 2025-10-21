export interface DesktopIcon {
  id: string;
  name: string;
  icon: string;
  position: {
    x: number;
    y: number;
  };
  action?: () => void;
}

export interface Position {
  x: number;
  y: number;
}


export interface Window {
  id: string;
  title: string;
  icon: string;
  position: Position;
  size: {
    width: number;
    height: number;
  };
  isMaximized: boolean;
  isMinimized: boolean;
  zIndex: number;
  content?: string;
}
