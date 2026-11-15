import {describe,it,expect,vi} from 'vitest';
import {render,screen,fireEvent} from '@testing-library/react';
import {AnalogSidebar} from './AnalogSidebar';
import {demoAnalogs} from '../../data/demoAnalogs';
import {rankAnalogs} from '../../utils/analogs';
describe('analogs sidebar',()=>{it('selects location and shows ranks',()=>{const onSelect=vi.fn();render(<AnalogSidebar target="moon" records={rankAnalogs(demoAnalogs,'moon',{search:'',minScore:0,minCoverage:0})} selectedId={null} onSelect={onSelect} filters={{search:'',minScore:0,minCoverage:0}} onFilters={()=>{}} onClose={()=>{}}/>);expect(screen.getByText('Lunar analogs')).toBeInTheDocument();fireEvent.click(screen.getByText('Mauna Kea'));expect(onSelect).toHaveBeenCalledWith('m2');expect(screen.getByText('01')).toBeInTheDocument();});});
