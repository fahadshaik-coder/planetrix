import {describe,it,expect,vi} from 'vitest';
import {render,screen,fireEvent} from '@testing-library/react';
import {ComparisonPanel} from './ComparisonPanel';
import {demoAnalogs} from '../../data/demoAnalogs';
describe('comparison drawer',()=>{it('shows demo warning, reference, eight categories, and closes',()=>{const close=vi.fn();render(<ComparisonPanel record={demoAnalogs[0]} onClose={close}/>);expect(screen.getByText('DEMO DATA')).toBeInTheDocument();expect(screen.getByText('Illustrative lunar mare reference')).toBeInTheDocument();expect(screen.getAllByText('Not available').length).toBeGreaterThan(0);expect(screen.getByText('8 CATEGORIES')).toBeInTheDocument();fireEvent.click(screen.getByRole('button',{name:'Close comparison panel'}));expect(close).toHaveBeenCalledOnce();});});
