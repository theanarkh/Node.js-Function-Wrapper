const { Module } = require('module');

function before(...args) {
    console.log(`before call function args: ${args}`);
}
function after(...args) {
    console.log(`after call function result: ${args}`)
}

const originRequire = Module.prototype.require;
// hack to make console init 
console.log('');

function newRequire(...args){
    let exports = originRequire.call(this, ...args);
    function patch(originFunc, key = originFunc.name) {
        function dummy(...args) {
            // you can do something before the function will be executed
            before([key, ...args]);
            let result;
            // if the function call by new, we call by new too
            if (new.target) {
                result = new originFunc(...args);
                // make the constructor point to new.target instead of originFunc because new.target maybe be a subclass of originFunc
                result.constructor = new.target;
            } else {
                result = originFunc.call(this, ...args);
            }
            const params = [key];
            if (result) {
                params.push(result);
            }
            // you can do something after the function have executed
            after(params);
            return result;
        }
        // we need merge the fields which is writable of originFunc into dummy
        for (const [key, descriptionInfo] of Object.entries(Object.getOwnPropertyDescriptors(originFunc))) {
            if (descriptionInfo.writable) {
                Object.defineProperty(dummy, key, descriptionInfo);
            }
        }
        // change the function name to the name of originFunc
        Object.defineProperty(dummy, 'name', { configurable: true, value: originFunc.name });
        Object.defineProperty(dummy, 'name', { configurable: false });
        // the prototype of dummy need point to originFunc.prototype
        dummy.prototype = originFunc.prototype;
        return dummy;
    }

    // wrapper all functions in export, but now we don not handle the exports recursively
    if (Object.prototype.toString.call(exports) === '[object Object]') {
        for (const [key, value] of Object.entries(exports)) {
            if (typeof value === 'function') {
                exports[key] = patch(value, key);
            }
        }
    } else if (Object.prototype.toString.call(exports) === '[object Function]') {
        exports = patch(exports);
    }
    return exports;
}

Module.prototype.require = newRequire;

const http = require('http');
http.createServer((req, res) => {
    res.end('ok');
}).listen(8888);
