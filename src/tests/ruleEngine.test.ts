import { describe, it, expect, vi } from 'vitest';
import { matchRule, partialMatch, processRuleTrigger } from '../../apps/rule_engine/ruleEngineCore.js';

describe('Rule Engine Core Logic', () => {
    describe('partialMatch', () => {
        it('should match exact values', () => {
            expect(partialMatch(60, 60)).toBe(true);
            expect(partialMatch('noteon', 'noteon')).toBe(true);
        });

        it('should match partial objects', () => {
            const target = { type: 'noteon', note: 60 };
            const data = { type: 'noteon', note: 60, velocity: 127 };
            expect(partialMatch(target, data)).toBe(true);
        });

        it('should fail on mismatching objects', () => {
            const target = { type: 'noteon', note: 60 };
            const data = { type: 'noteoff', note: 60 };
            expect(partialMatch(target, data)).toBe(false);
        });
    });

    describe('matchRule', () => {
        it('should match when ifPayload is empty', () => {
            const rule = { ifPayload: '' };
            expect(matchRule(rule, { some: 'data' })).toBe(true);
        });

        it('should match when ifPayload matches incoming data', () => {
            const rule = { ifPayload: JSON.stringify({ note: 60 }) };
            expect(matchRule(rule, { note: 60, velocity: 100 })).toBe(true);
        });

        it('should fail when ifPayload does not match', () => {
            const rule = { ifPayload: JSON.stringify({ note: 64 }) };
            expect(matchRule(rule, { note: 60 })).toBe(false);
        });

        it('should match using string inclusion when ifPayload is not valid JSON', () => {
            const rule = { ifPayload: 'hello' };
            expect(matchRule(rule, 'hello world')).toBe(true);
            expect(matchRule(rule, 'bye world')).toBe(false);
        });
    });

    describe('processRuleTrigger', () => {
        it('should trigger immediately when no throttle is set', () => {
            const rule = { _lastTriggerTime: 0 };
            const callback = vi.fn();
            const result = processRuleTrigger(rule, { data: 1 }, callback);
            expect(result).toBe(true);
            expect(callback).toHaveBeenCalled();
        });

        it('should throttle by interval', () => {
            const rule = { 
                throttleMode: 'interval', 
                throttleValue: 1000, 
                _lastTriggerTime: Date.now() 
            };
            const callback = vi.fn();
            const result = processRuleTrigger(rule, { data: 1 }, callback);
            expect(result).toBe(false);
            expect(callback).not.toHaveBeenCalled();
        });

        it('should throttle by change', () => {
            const rule = { 
                throttleMode: 'change', 
                _lastPayload: JSON.stringify({ data: 1 }) 
            };
            const callback = vi.fn();
            const result = processRuleTrigger(rule, { data: 1 }, callback);
            expect(result).toBe(false);
            expect(callback).not.toHaveBeenCalled();

            const result2 = processRuleTrigger(rule, { data: 2 }, callback);
            expect(result2).toBe(true);
            expect(callback).toHaveBeenCalled();
        });
    });
});
