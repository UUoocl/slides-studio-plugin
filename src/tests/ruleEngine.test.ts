import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { matchRule, partialMatch, processRuleTrigger, checkRule, executeActions } from '../../apps/rule_engine/ruleEngineCore.js';

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
            expect(matchRule(rule, { note: 64 })).toBe(false);
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
                if: { payload: 'obs_?_changed', matchMode: 'wildcard' } 
            };
            expect(matchRule(rule, 'obs_1_changed')).toBe(true);
            expect(matchRule(rule, 'obs_12_changed')).toBe(false);
        });

        it('should fallback to string matching if JSON parsing fails in matchRule', () => {
            const rule = { 
                if: { payload: 'exact_string', matchMode: 'exact' } 
            };
            expect(matchRule(rule, 'exact_string')).toBe(true);
            expect(matchRule(rule, 'other')).toBe(false);

            const rule2 = { if: { payload: 'partial', matchMode: 'partial' } };
            expect(matchRule(rule2, 'partial_match')).toBe(true);
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

    describe('executeActions', () => {
        beforeEach(() => {
            vi.useFakeTimers();
        });
        afterEach(() => {
            vi.useRealTimers();
        });

        it('should execute multiple sequential actions immediately if no delay', async () => {
            const rule = {
                then: [
                    { channel: 'ch1', payload: 'p1' },
                    { channel: 'ch2', payload: 'p2' }
                ]
            };
            const publishFn = vi.fn();
            
            executeActions(rule, {}, publishFn);
            
            expect(publishFn).toHaveBeenCalledTimes(2);
            expect(publishFn).toHaveBeenNthCalledWith(1, 'ch1', 'p1');
            expect(publishFn).toHaveBeenNthCalledWith(2, 'ch2', 'p2');
        });

        it('should respect delays for actions', async () => {
            const rule = {
                then: [
                    { channel: 'immediate', payload: 'now' },
                    { channel: 'delayed', payload: 'later', delay: 1000 }
                ]
            };
            const publishFn = vi.fn();
            
            executeActions(rule, {}, publishFn);
            
            expect(publishFn).toHaveBeenCalledTimes(1);
            expect(publishFn).toHaveBeenCalledWith('immediate', 'now');
            
            vi.advanceTimersByTime(500);
            expect(publishFn).toHaveBeenCalledTimes(1);
            
            vi.advanceTimersByTime(500);
            expect(publishFn).toHaveBeenCalledTimes(2);
            expect(publishFn).toHaveBeenLastCalledWith('delayed', 'later');
        });
    });
});
