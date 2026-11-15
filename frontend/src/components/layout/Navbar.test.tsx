import {describe,it,expect,vi} from 'vitest';
import {render,screen,fireEvent} from '@testing-library/react';
import {Navbar} from './Navbar';
describe('planetary selection',()=>{it('switches Moon to Mars using a real button',()=>{const setTarget=vi.fn();render(<Navbar target="moon" setTarget={setTarget} mode="demo" setMode={()=>{}} onInfo={()=>{}}/>);expect(screen.getByRole('button',{name:'MOON'})).toHaveAttribute('aria-pressed','true');fireEvent.click(screen.getByRole('button',{name:'MARS'}));expect(setTarget).toHaveBeenCalledWith('mars');});});
