import { ChartData } from '../../lib/types';

export interface ChartBoardItem {
  id: string;
  chartData: ChartData;
  position: { x: number; y: number };
  size: { width: number; height: number };
  title: string;
  createdAt: Date;
}

export type ViewMode = 'chat' | 'split' | 'board';

export interface ChartBoardItemUpdate {
  id: string;
  position?: { x: number; y: number };
  size?: { width: number; height: number };
  title?: string;
}