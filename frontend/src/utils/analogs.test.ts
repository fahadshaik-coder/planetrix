import {describe,it,expect} from 'vitest';
import {demoAnalogs} from '../data/demoAnalogs';
import {coverage,percent,rankAnalogs,validateRecords} from './analogs';
const all={search:'',minScore:0,minCoverage:0};
describe('PLANETREX scientific UI data safeguards',()=>{
 it('switches target and sorts scores highest first',()=>{const moon=rankAnalogs(demoAnalogs,'moon',all);const mars=rankAnalogs(demoAnalogs,'mars',all);expect(moon).toHaveLength(5);expect(mars).toHaveLength(5);expect(moon.every(r=>r.reference.body==='moon')).toBe(true);expect(mars.every(r=>r.reference.body==='mars')).toBe(true);expect(moon[0].similarity.percent).toBeGreaterThan(moon[1].similarity.percent!);});
 it('filters search, similarity and completeness',()=>{expect(rankAnalogs(demoAnalogs,'mars',{search:'atacama',minScore:90,minCoverage:75})).toHaveLength(1);expect(rankAnalogs(demoAnalogs,'mars',{search:'atacama',minScore:95,minCoverage:75})).toHaveLength(0);expect(rankAnalogs(demoAnalogs,'moon',{search:'',minScore:0,minCoverage:90})).toHaveLength(0);});
 it('labels demonstration data and does not synthesize category scores',()=>{expect(demoAnalogs.every(r=>r.demonstration&&r.evidence.status==='demonstration'&&r.categories.every(c=>c.similarity.percent===null&&c.measurements.length===0))).toBe(true);});
 it('displays missing values as Not available, never zero',()=>{expect(percent(null)).toBe('Not available');expect(coverage(null)).toBe('Not available');expect(percent(0)).toBe('0%');});
 it('validates backend response shapes',()=>{expect(validateRecords([demoAnalogs[0]])).toHaveLength(1);expect(()=>validateRecords({data:[]})).toThrow();expect(()=>validateRecords([{id:'invalid'}])).toThrow();expect(()=>validateRecords([{...demoAnalogs[0],demonstration:false}])).toThrow();});
});
