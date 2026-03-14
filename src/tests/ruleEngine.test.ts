import { describe, it, expect, vi } from 'vitest';
import { matchRule, partialMatch, processRuleTrigger, checkRule } from '../../apps/rule_engine/ruleEngineCore.js';

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

    describe('matchRule (New Structure)', () => {
        it('should match using partial mode (default)', () => {
            const rule = { 
                if: { payload: JSON.stringify({ note: 60 }), matchMode: 'partial' } 
            };
            expect(matchRule(rule, { note: 60, velocity: 100 })).toBe(true);
        });

        it('should match using exact mode', () => {
            const rule = { 
                if: { payload: JSON.stringify({ note: 60 }), matchMode: 'exact' } 
            };
            expect(matchRule(rule, { note: 60 })).toBe(true);
            expect(matchRule(rule, { note: 60, velocity: 100 })).toBe(false);
        });

        it('should match using regex mode', () => {
            const rule = { 
                if: { payload: '^hello.*world$', matchMode: 'regex' } 
            };
            expect(matchRule(rule, 'hello brave new world')).toBe(true);
            expect(matchRule(rule, 'bye world')).toBe(false);
        });

        it('should match using wildcard mode', () => {
            const rule = { 
                if: { payload: 'obs_*_changed', matchMode: 'wildcard' } 
            };
            expect(matchRule(rule, 'obs_scene_changed')).toBe(true);
            expect(matchRule(rule, 'obs_source_added')).toBe(false);
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

    describe('checkRule (State Clearing)', () => {
        it('should clear throttle state even on mismatch', () => {
            const rule = { 
                ifPayload: JSON.stringify({ active: true }), 
                throttleMode: 'change',
                _lastPayload: null 
            };
            const callback = vi.fn();

            // 1. First matching message -> trigger
            checkRule(rule, { active: true }, callback);
            expect(callback).toHaveBeenCalledTimes(1);

            // 2. Same matching message -> throttled
            checkRule(rule, { active: true }, callback);
            expect(callback).toHaveBeenCalledTimes(1);

            // 3. Different NON-matching message -> should clear _lastPayload
            checkRule(rule, { active: false }, callback);
            expect(callback).toHaveBeenCalledTimes(1); // No new trigger

            // 4. Same matching message as step 1 -> SHOULD trigger again because state was cleared
            checkRule(rule, { active: true }, callback);
            expect(callback).toHaveBeenCalledTimes(2);
        });
    });
});
