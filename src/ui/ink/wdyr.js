"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/// <reference types="@welldone-software/why-did-you-render" />
const react_1 = __importDefault(require("react"));
// Only run in development mode and when explicitly enabled
if (process.env.NODE_ENV === 'development' || process.env.NAPOLEON_DEBUG === 'true' || process.env.NAPOLEON_DEBUG_RENDERS === 'true') {
    if (typeof window !== 'undefined') {
        // For browser environments (not applicable for Ink, but kept for completeness)
        const whyDidYouRender = require('@welldone-software/why-did-you-render');
        whyDidYouRender(react_1.default, {
            trackAllPureComponents: false,
            trackHooks: true,
            logOwnerReasons: true,
            logOnDifferentValues: true,
            // Custom console group for terminal visibility
            consoleGroup: '🔍 Napoleon Re-render',
            consoleCollapsed: false,
            // Include component name in logs
            titleColor: 'yellow',
            diffNameColor: 'cyan',
            diffPathColor: 'blue',
            notifier: (updateInfo) => {
                // Custom notifier for terminal output
                console.log('\n' + '='.repeat(60));
                console.log('🔍 Napoleon Re-render Detected:');
                console.log(`Component: ${updateInfo.displayName}`);
                console.log(`Reason: ${updateInfo.reason?.propsDifferences?.length ? 'Props changed' : 'State/hooks changed'}`);
                if (updateInfo.reason?.propsDifferences?.length) {
                    console.log('Changed props:');
                    updateInfo.reason.propsDifferences.forEach((diff) => {
                        console.log(`  - ${diff.pathString}: ${diff.prevValue} → ${diff.nextValue}`);
                    });
                }
                if (updateInfo.reason?.stateDifferences?.length) {
                    console.log('Changed state:');
                    updateInfo.reason.stateDifferences.forEach((diff) => {
                        console.log(`  - ${diff.pathString}: ${diff.prevValue} → ${diff.nextValue}`);
                    });
                }
                if (updateInfo.reason?.hookDifferences?.length) {
                    console.log('Changed hooks:');
                    updateInfo.reason.hookDifferences.forEach((diff) => {
                        console.log(`  - Hook ${diff.hookIndex}: ${diff.prevValue} → ${diff.nextValue}`);
                    });
                }
                console.log('='.repeat(60) + '\n');
            }
        });
    }
    else {
        // For Node.js/Ink environment
        try {
            const whyDidYouRender = require('@welldone-software/why-did-you-render');
            whyDidYouRender(react_1.default, {
                trackAllPureComponents: false,
                trackHooks: true,
                logOwnerReasons: true,
                logOnDifferentValues: true,
                include: [/^(App|AgentList|AgentItem|SpawnDialog|TerminationDialog|Header|Footer|MainContent|DetailView)$/],
                exclude: [/^ErrorBoundary/],
                // Terminal-friendly output
                notifier: (updateInfo) => {
                    // Only log if we have actual differences
                    if (!updateInfo.reason)
                        return;
                    const hasPropChanges = updateInfo.reason.propsDifferences?.length > 0;
                    const hasStateChanges = updateInfo.reason.stateDifferences?.length > 0;
                    const hasHookChanges = updateInfo.reason.hookDifferences?.length > 0;
                    if (!hasPropChanges && !hasStateChanges && !hasHookChanges)
                        return;
                    console.log('\n' + '─'.repeat(60));
                    console.log(`🔍 Re-render: ${updateInfo.displayName || 'Unknown Component'}`);
                    if (hasPropChanges) {
                        console.log('📦 Props changed:');
                        updateInfo.reason.propsDifferences.forEach((diff) => {
                            const prevStr = JSON.stringify(diff.prevValue);
                            const nextStr = JSON.stringify(diff.nextValue);
                            console.log(`   ${diff.pathString}: ${prevStr} → ${nextStr}`);
                        });
                    }
                    if (hasStateChanges) {
                        console.log('📊 State changed:');
                        updateInfo.reason.stateDifferences.forEach((diff) => {
                            const prevStr = JSON.stringify(diff.prevValue);
                            const nextStr = JSON.stringify(diff.nextValue);
                            console.log(`   ${diff.pathString}: ${prevStr} → ${nextStr}`);
                        });
                    }
                    if (hasHookChanges) {
                        console.log('🪝 Hooks changed:');
                        updateInfo.reason.hookDifferences.forEach((diff) => {
                            console.log(`   Hook[${diff.hookIndex}] changed`);
                        });
                    }
                    console.log('─'.repeat(60));
                }
            });
            console.log('✅ why-did-you-render is loaded (NODE_ENV=' + process.env.NODE_ENV + ')');
        }
        catch (error) {
            console.warn('⚠️ Failed to load why-did-you-render:', error.message);
        }
    }
}
