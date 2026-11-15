import {describe,it,expect} from 'vitest';
import {render,screen,fireEvent} from '@testing-library/react';
import {ScientificCategory} from './ScientificCategory';
import {demoAnalogs} from '../../data/demoAnalogs';
describe('scientific category',()=>{it('renders category and empty measurements',()=>{render(<ScientificCategory category={demoAnalogs[0].categories[0]}/>);expect(screen.getByText('Geology & mineralogy')).toBeInTheDocument();fireEvent.click(screen.getByText('Geology & mineralogy'));expect(screen.getAllByText('Not available').length).toBeGreaterThan(0);});});
