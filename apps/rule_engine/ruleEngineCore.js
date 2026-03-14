/**
 * Core Rule Engine logic for matching and processing rules.
 */

/**
 * Checks if target object is partially matched by data object.
 * @param {any} target The pattern to match against.
 * @param {any} data The incoming data.
 * @returns {boolean} True if data matches the target pattern.
 */
export function partialMatch(target, data) {
    if (target === data) return true;
    if (typeof target !== 'object' || target === null || typeof data !== 'object' || data === null) {
        return target == data;
    }
    
    for (const key in target) {
        if (!(key in data) || !partialMatch(target[key], data[key])) {
            return false;
        }
    }
    return true;
}

/**
 * Checks if target object is exactly matched by data object.
 * @param {any} target The pattern to match against.
 * @param {any} data The incoming data.
 * @returns {boolean} True if data matches the target pattern exactly.
 */
export function exactMatch(target, data) {
    if (target === data) return true;
    if (typeof target !== 'object' || target === null || typeof data !== 'object' || data === null) {
        return target == data;
    }
    
    const targetKeys = Object.keys(target);
    const dataKeys = Object.keys(data);
    
    if (targetKeys.length !== dataKeys.length) return false;
    
    for (const key of targetKeys) {
        if (!exactMatch(target[key], data[key])) {
            return false;
        }
    }
    return true;
}

/**
 * Converts a wildcard string (* and ?) to a Regular Expression.
 * @param {string} wildcard The wildcard string.
 * @returns {RegExp} The equivalent RegExp.
 */
function wildcardToRegex(wildcard) {
    const escaped = wildcard.replace(/[.+^${}()|[\]\\]/g, '\\$&'); // Escape regex special chars
    const pattern = escaped.replace(/\*/g, '.*').replace(/\?/g, '.');
    return new RegExp(`^${pattern}$`);
}

/**
 * Determines if a rule triggers based on incoming data.
 * @param {object} rule The rule configuration.
 * @param {any} data The incoming data from the channel.
 * @returns {boolean} True if the rule matches.
 */
export function matchRule(rule, data) {
    // Support new structure { if: { payload, matchMode } }
    const ifConfig = rule.if || { payload: rule.ifPayload, matchMode: 'partial' };
    const { payload, matchMode = 'partial' } = ifConfig;

    if (!payload || (typeof payload === 'string' && payload.trim() === '')) return true;

    // Handle string matching modes (regex, wildcard)
    if (matchMode === 'regex' || matchMode === 'wildcard') {
        const incomingStr = typeof data === 'string' ? data : JSON.stringify(data);
        const regex = matchMode === 'regex' ? new RegExp(payload) : wildcardToRegex(payload);
        return regex.test(incomingStr);
    }

    try {
        const target = typeof payload === 'string' ? JSON.parse(payload) : payload;
        
        if (matchMode === 'exact') {
            return exactMatch(target, data);
        } else {
            // Default to 'partial'
            return partialMatch(target, data);
        }
    } catch (e) {
        const incomingStr = typeof data === 'string' ? data : JSON.stringify(data);
        if (matchMode === 'exact') {
            return incomingStr === payload;
        }
        return incomingStr.includes(payload);
    }
}

/**
 * Checks if a rule should trigger based on data and throttle state.
 * Updates the rule's internal state (_lastPayload, _lastTriggerTime).
 * @param {object} rule The rule configuration.
 * @param {any} data The incoming data.
 * @param {function} triggerCallback Optional callback to execute on successful trigger.
 * @returns {boolean} True if the rule triggered.
 */
export function checkRule(rule, data, triggerCallback) {
    const isMatch = matchRule(rule, data);
    const now = Date.now();
    const currentPayloadStr = JSON.stringify(data);
    
    // Track if payload changed for 'change' throttle
    const payloadChanged = rule._lastPayload !== currentPayloadStr;
    // ALWAYS update _lastPayload to allow "clearing" the event state
    rule._lastPayload = currentPayloadStr;

    if (!isMatch) return false;

    // Throttle logic
    if (rule.throttleMode === 'change') {
        if (!payloadChanged) return false;
    } else if (rule.throttleMode === 'interval') {
        if (now - (rule._lastTriggerTime || 0) < (rule.throttleValue || 0)) return false;
    }

    rule._lastTriggerTime = now;
    if (triggerCallback) {
        triggerCallback(rule, data);
    }
    return true;
}

/**
 * Processes a rule trigger with throttling logic.
 * @deprecated Use checkRule instead for better throttle clearing.
 * @param {object} rule The rule configuration.
 * @param {any} data The incoming data.
 * @param {function} triggerCallback Function to call if trigger is successful.
 * @returns {boolean} True if the trigger was processed.
 */
export function processRuleTrigger(rule, data, triggerCallback) {
    return checkRule(rule, data, triggerCallback);
}
