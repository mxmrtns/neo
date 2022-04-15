import Base from '../core/Base.mjs';

/**
 * @class Neo.remotes.Api
 * @extends Neo.core.Base
 * @singleton
 */
class Api extends Base {
    static getConfig() {return {
        /**
         * @member {String} className='Neo.remotes.Api'
         * @protected
         */
        className: 'Neo.remotes.Api',
        /**
         * @member {Boolean} singleton=true
         * @protected
         */
        singleton: true
    }}

    /**
     * @param {String} service
     * @param {String} method
     * @returns {function(*=, *=): Promise<any>}
     */
    generateRemote(service, method) {
        return function(...args) {
            return Neo.currentWorker.promiseMessage('data', {
                action: 'rpc',
                method,
                params: [...args],
                service
            })
        }
    }

    /**
     *
     */
    load() {
        let config = Neo.config,
            path   = config.remotesApiUrl;

        // relative paths need a special treatment
        if (!path.includes('http')) {
            path = config.appPath.split('/');
            path.pop();
            path = `../../${path.join('/')}/${config.remotesApiUrl}`;
        }

        fetch(path)
            .then(response => response.json())
            .then(data => {
                Neo.currentWorker.sendMessage('data', {action: 'registerApi', data});
                this.register(data)
            })
    }

    /**
     * @param {Object} data
     */
    register(data) {
        let ns;

        Object.entries(data.services).forEach(([serviceKey, serviceValue]) => {
            ns = Neo.ns(`${data.namespace}.${serviceKey}`, true);

            Object.entries(serviceValue.methods).forEach(([methodKey, methodValue]) => {
                ns[methodKey] = this.generateRemote(serviceKey, methodKey);
            })
        })
    }
}

Neo.applyClassConfig(Api);

let instance = Neo.create(Api);

Neo.applyToGlobalNs(instance);

export default instance;
