// @flow

import { isRegex, noop } from './util';

const CONSTANTS = {
    MOCK_PROTOCOL: 'mock:',
    FILE_PROTOCOL: 'file:',
    WILDCARD: '*'
};

let IE_WIN_ACCESS_ERROR = 'Call was rejected by callee.\r\n';

export function getActualDomain(win : any) {

    let location = win.location;

    if (!location) {
        throw new Error(`Can not read window location`);
    }

    let protocol = location.protocol;

    if (!protocol) {
        throw new Error(`Can not read window protocol`);
    }

    if (protocol === CONSTANTS.FILE_PROTOCOL) {
        return 'file://';
    }

    let host = location.host;

    if (!host) {
        throw new Error(`Can not read window host`);
    }

    return `${protocol}//${host}`;
}

export function getDomain(win : any) {

    win = win || window;

    let domain = getActualDomain(win);

    if (domain && win.mockDomain && win.mockDomain.indexOf(CONSTANTS.MOCK_PROTOCOL) === 0) {
        return win.mockDomain;
    }

    return domain;
}

export function isBlankDomain(win : any) {
    try {
        if (!win.location.href) {
            return true;
        }

        if (win.location.href === 'about:blank') {
            return true;
        }
    } catch (err) {
        // pass
    }

    return false;
}

export function isActuallySameDomain(win : any) {

    try {
        let desc = Object.getOwnPropertyDescriptor(win, 'location');

        if (desc && desc.enumerable === false) {
            return false;
        }

    } catch (err) {
        // pass
    }

    try {
        if (isBlankDomain(win)) {
            return true;
        }

        if (getActualDomain(win) === getActualDomain(window)) {
            return true;
        }

    } catch (err) {
        // pass
    }

    return false;
}

export function isSameDomain(win : any) {

    if (!isActuallySameDomain(win)) {
        return false;
    }

    try {

        if (isBlankDomain(win)) {
            return true;
        }

        if (getDomain(window) === getDomain(win)) {
            return true;
        }

    } catch (err) {
        // pass
    }

    return false;
}

export function getParent(win : any) {

    if (!win) {
        return;
    }

    try {
        if (win.parent && win.parent !== win) {
            return win.parent;
        }
    } catch (err) {
        return;
    }
}

export function getOpener(win : any) {

    if (!win) {
        return;
    }

    // Make sure we're not actually an iframe which has had window.open() called on us
    if (getParent(win)) {
        return;
    }

    try {
        return win.opener;
    } catch (err) {
        return;
    }
}



export function getParents(win : any) {

    let result = [];

    try {

        while (win.parent !== win) {
            result.push(win.parent);
            win = win.parent;
        }

    } catch (err) {
        // pass
    }

    return result;
}

export function isAncestorParent(parent : any, child : any) {

    if (!parent || !child) {
        return false;
    }

    let childParent = getParent(child);

    if (childParent) {
        return childParent === parent;
    }

    if (getParents(child).indexOf(parent) !== -1) {
        return true;
    }

    return false;
}

export function getFrames(win : any) {

    let result = [];

    let frames;

    try {
        frames = win.frames;
    } catch (err) {
        frames = win;
    }

    let len;

    try {
        len = frames.length;
    } catch (err) {
        // pass
    }

    if (len === 0) {
        return result;
    }

    if (len) {
        for (let i = 0; i < len; i++) {

            let frame;

            try {
                frame = frames[i];
            } catch (err) {
                continue;
            }

            result.push(frame);
        }

        return result;
    }

    for (let i = 0; i < 100; i++) {
        let frame;

        try {
            frame = frames[i];
        } catch (err) {
            return result;
        }

        if (!frame) {
            return result;
        }

        result.push(frame);
    }

    return result;
}


export function getAllChildFrames(win : any) {

    let result = [];

    for (let frame of getFrames(win)) {
        result.push(frame);

        for (let childFrame of getAllChildFrames(frame)) {
            result.push(childFrame);
        }
    }

    return result;
}

export function getTop(win : any) {

    if (!win) {
        return;
    }

    try {
        if (win.top) {
            return win.top;
        }
    } catch (err) {
        // pass
    }

    if (getParent(win) === win) {
        return win;
    }

    try {
        if (isAncestorParent(window, win) && window.top) {
            return window.top;
        }
    } catch (err) {
        // pass
    }

    try {
        if (isAncestorParent(win, window) && window.top) {
            return window.top;
        }
    } catch (err) {
        // pass
    }

    for (let frame of getAllChildFrames(win)) {
        try {
            if (frame.top) {
                return frame.top;
            }
        } catch (err) {
            // pass
        }

        if (getParent(frame) === frame) {
            return frame;
        }
    }
}

export function getAllFramesInWindow(win : any) : Array<any> {
    let top = getTop(win);
    return getAllChildFrames(top).concat(top);
}

export function isTop(win : any) : boolean {
    return win === getTop(win);
}

export function isFrameWindowClosed(frame : HTMLIFrameElement) : boolean {

    if (!frame.contentWindow) {
        return true;
    }

    if (!frame.parentNode) {
        return true;
    }

    let doc = frame.ownerDocument;

    if (doc && doc.body && !doc.body.contains(frame)) {
        return true;
    }

    return false;
}

function safeIndexOf<T>(collection : Array<T>, item : T) {
    for (let i = 0; i < collection.length; i++) {

        try {
            if (collection[i] === item) {
                return i;
            }
        } catch (err) {
            // pass
        }
    }

    return -1;
}

let iframeWindows = [];
let iframeFrames = [];

export function isWindowClosed(win : any, allowMock : boolean = true) {

    try {
        if (win === window) {
            return false;
        }
    } catch (err) {
        return true;
    }

    try {
        if (!win) {
            return true;
        }

    } catch (err) {
        return true;
    }

    try {
        if (win.closed) {
            return true;
        }

    } catch (err) {

        // I love you so much IE

        if (err && err.message === IE_WIN_ACCESS_ERROR) {
            return false;
        }

        return true;
    }


    if (allowMock && isSameDomain(win)) {
        try {
            if (win.mockclosed) {
                return true;
            }
        } catch (err) {
            // pass
        }
    }

    // Mobile safari

    try {
        if (!win.parent || !win.top) {
            return true;
        }
    } catch (err) {
        // pass
    }

    // Yes, this actually happens in IE. win === win errors out when the window
    // is from an iframe, and the iframe was removed from the page.

    try {
        noop(win === win); // eslint-disable-line no-self-compare
    } catch (err) {
        return true;
    }

    // IE orphaned frame

    let iframeIndex = safeIndexOf(iframeWindows, win);

    if (iframeIndex !== -1) {
        let frame = iframeFrames[iframeIndex];

        if (frame && isFrameWindowClosed(frame)) {
            return true;
        }
    }

    return false;
}

function cleanIframes() {

    for (let i = 0; i < iframeFrames.length; i++) {
        if (isFrameWindowClosed(iframeFrames[i])) {
            iframeFrames.splice(i, 1);
            iframeWindows.splice(i, 1);
        }
    }

    for (let i = 0; i < iframeWindows.length; i++) {
        if (isWindowClosed(iframeWindows[i])) {
            iframeFrames.splice(i, 1);
            iframeWindows.splice(i, 1);
        }
    }
}

export function linkFrameWindow(frame : HTMLIFrameElement) {

    cleanIframes();

    if (frame && frame.contentWindow) {
        try {
            iframeWindows.push(frame.contentWindow);
            iframeFrames.push(frame);
        } catch (err) {
            // pass
        }
    }
}

export function getUserAgent(win : any) {
    win = win || window;
    return win.navigator.mockUserAgent || win.navigator.userAgent;
}


export function getFrameByName(win : any, name : string) {

    let winFrames = getFrames(win);

    for (let childFrame of winFrames) {
        try {
            if (isSameDomain(childFrame) && childFrame.name === name && winFrames.indexOf(childFrame) !== -1) {
                return childFrame;
            }
        } catch (err) {
            // pass
        }
    }

    try {
        if (winFrames.indexOf(win.frames[name]) !== -1) {
            return win.frames[name];
        }
    } catch (err) {
        // pass
    }

    try {
        if (winFrames.indexOf(win[name]) !== -1) {
            return win[name];
        }
    } catch (err) {
        // pass
    }
}

export function findChildFrameByName(win : any, name : string) {

    let frame = getFrameByName(win, name);

    if (frame) {
        return frame;
    }

    for (let childFrame of getFrames(win)) {
        let namedFrame = findChildFrameByName(childFrame, name);

        if (namedFrame) {
            return namedFrame;
        }
    }
}

export function findFrameByName(win : any, name : string) {

    let frame;

    frame = getFrameByName(win, name);

    if (frame) {
        return frame;
    }

    return findChildFrameByName(getTop(win), name);
}

export function isParent(win : any, frame : any) {

    let frameParent = getParent(frame);

    if (frameParent) {
        return frameParent === win;
    }

    for (let childFrame of getFrames(win)) {
        if (childFrame === frame) {
            return true;
        }
    }

    return false;
}

export function isOpener(parent : any, child : any) {

    return parent === getOpener(child);
}

export function getAncestor(win : any) {
    win = win || window;

    let opener = getOpener(win);

    if (opener) {
        return opener;
    }

    let parent = getParent(win);

    if (parent) {
        return parent;
    }
}

export function getAncestors(win : any) {

    let results = [];

    let ancestor = win;

    while (ancestor) {
        ancestor = getAncestor(ancestor);
        if (ancestor) {
            results.push(ancestor);
        }
    }

    return results;
}


export function isAncestor(parent : any, child : any) {

    let actualParent = getAncestor(child);

    if (actualParent) {
        if (actualParent === parent) {
            return true;
        }

        return false;
    }

    if (child === parent) {
        return false;
    }

    if (getTop(child) === child) {
        return false;
    }

    for (let frame of getFrames(parent)) {
        if (frame === child) {
            return true;
        }
    }

    return false;
}

export function isPopup() {
    return Boolean(getOpener(window));
}

export function isIframe() {
    return Boolean(getParent(window));
}

export function isFullpage() {
    return Boolean(!isIframe() && !isPopup());
}

function anyMatch(collection1, collection2) {

    for (let item1 of collection1) {
        for (let item2 of collection2) {
            if (item1 === item2) {
                return true;
            }
        }
    }
}

export function getDistanceFromTop(win : any = window) {
    let distance = 0;

    while (win) {
        win = getParent(win);
        if (win) {
            distance += 1;
        }
    }

    return distance;
}

export function getNthParent(win : any, n : number = 1) {
    for (let i = 0; i < n; i++) {
        win = getParent(win);
    }
    return win;
}

export function getNthParentFromTop(win : any, n : number = 1) {
    return getNthParent(win, getDistanceFromTop(win) - n);
}

export function isSameTopWindow(win1 : any, win2 : any) {

    let top1 = getTop(win1);
    let top2 = getTop(win2);

    try {
        if (top1 && top2) {
            if (top1 === top2) {
                return true;
            }

            return false;
        }
    } catch (err) {
        // pass
    }

    let allFrames1 = getAllFramesInWindow(win1);
    let allFrames2 = getAllFramesInWindow(win2);

    if (anyMatch(allFrames1, allFrames2)) {
        return true;
    }

    let opener1 = getOpener(top1);
    let opener2 = getOpener(top2);

    if (opener1 && anyMatch(getAllFramesInWindow(opener1), allFrames2)) {
        return false;
    }

    if (opener2 && anyMatch(getAllFramesInWindow(opener2), allFrames1)) {
        return false;
    }
}

export function matchDomain(pattern : any, origin : any) {

    if (typeof pattern === 'string') {

        if (typeof origin === 'string') {
            return pattern === CONSTANTS.WILDCARD || origin === pattern;
        }

        if (isRegex(origin)) {
            return false;
        }

        if (Array.isArray(origin)) {
            return false;
        }
    }

    if (isRegex(pattern)) {

        if (isRegex(origin)) {
            return pattern.toString() === origin.toString();
        }

        if (Array.isArray(origin)) {
            return false;
        }

        return Boolean(origin.match(pattern));
    }

    if (Array.isArray(pattern)) {

        if (Array.isArray(origin)) {
            return JSON.stringify(pattern) === JSON.stringify(origin);
        }

        if (isRegex(origin)) {
            return false;
        }

        return pattern.some(subpattern => matchDomain(subpattern, origin));
    }

    return false;
}

export function getDomainFromUrl(url : string) {

    let domain;

    if (url.match(/^(https?|mock|file):\/\//)) {
        domain = url;
    } else {
        return getDomain();
    }

    domain = domain.split('/').slice(0, 3).join('/');

    return domain;
}

export function onCloseWindow(win : any, callback : Function, delay : number = 1000, maxtime : number = Infinity) : { cancel : () => void } {

    let timeout;

    let check = () => {

        if (isWindowClosed(win)) {

            if (timeout) {
                clearTimeout(timeout);
            }

            return callback();
        }

        if (maxtime <= 0) {
            clearTimeout(timeout);
        } else {
            maxtime -= delay;
            timeout = setTimeout(check, delay);
        }
    };

    check();

    return {
        cancel() {
            if (timeout) {
                clearTimeout(timeout);
            }
        }
    };
}

export function isWindow(obj : Object) {

    try {
        if (obj === window) {
            return true;
        }
    } catch (err) {
        if (err && err.message === IE_WIN_ACCESS_ERROR) {
            return true;
        }
    }

    try {
        if (Object.prototype.toString.call(obj) === '[object Window]') {
            return true;
        }
    } catch (err) {
        if (err && err.message === IE_WIN_ACCESS_ERROR) {
            return true;
        }
    }

    try {
        if (window.Window && obj instanceof window.Window) {
            return true;
        }
    } catch (err) {
        if (err && err.message === IE_WIN_ACCESS_ERROR) {
            return true;
        }
    }

    try {
        if (obj && obj.self === obj) {
            return true;
        }
    } catch (err) {
        if (err && err.message === IE_WIN_ACCESS_ERROR) {
            return true;
        }
    }

    try {
        if (obj && obj.parent === obj) {
            return true;
        }
    } catch (err) {
        if (err && err.message === IE_WIN_ACCESS_ERROR) {
            return true;
        }
    }

    try {
        if (obj && obj.top === obj) {
            return true;
        }
    } catch (err) {
        if (err && err.message === IE_WIN_ACCESS_ERROR) {
            return true;
        }
    }

    try {
        noop(obj === obj);  // eslint-disable-line no-self-compare

    } catch (err) {
        return true;
    }

    try {
        noop(obj && obj.__cross_domain_utils_window_check__);

    } catch (err) {
        return true;
    }

    return false;
}
