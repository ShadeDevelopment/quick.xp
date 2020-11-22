const XPError = require('./XPError');
const db = require('quick.db');

class SQLiteManager {

    /**
     * 
     * @param {object} options - Options
     * @param {number} [options.cooldown=60000] - Cooldown 
     * @param {string} [options.levelUpMessage] - Level Up Message
     * @param {string} [options.levelUpChannel] - Channel to send level up messages
     * @param {boolean} [options.dm=false] - If the bot should send the level up message in DMS
     * @param {string} [options.noDM] - Channel to send level up message if DM of a user is disabled
     *                                - leave empty to send in current channel
     */
    constructor(options) {
        this.validateOptions(options);

        /**
         * Database
         * @type {db}
         */
        this.db = db;

        /**
         * Cooldown
         * @type {number}
         */
        this.cooldown = options.cooldown || 60000;

        /**
         * Level up message
         * @type {string}
         */
        this.levelUpMessage = options.levelUpMessage || ":tada: | {{user}} just advanced to level {{level}}";

        /**
         * Level Up Channel
         * @type {string}
         */
        this.levelUpChannel = options.levelUpChannel || null;

        /**
         * If the bot should send level up messages in DM
         * @type {boolean}
         */
        this.dm = options.dm || false;

        /**
         * Channel to send level up message if DM of a user is disabled
         */
        this.noDM = options.noDM || undefined;
    }

    /**
    * giveXP - Give XP to a user
    * @param {string} message - User Message 
    * @param {number} xprate - The rate of XP
    */
    giveXP(message, xprate) {
        if (!message) throw new XPError('Message was not provided!')
        if (!xprate) xprate = 1;
        if (isNaN(xprate)) throw new XPError(`The XP Rate provided isn't a number!`);

        const KEYS = {
            LEVEL: `level_${message.guild.id}_${message.author.id}`,
            PREVIOUSLY_REQUIRED: `previousrequired_${message.guild.id}_${message.author.id}`,
            REQUIRED_XP: `requiredxp_${message.guild.id}_${message.author.id}`,
            COOLDOWN: `xpcooldown_${message.guild.id}_${message.author.id}`,
        }

        let cooldown = this.cooldown;
        let level = db.get(KEYS.LEVEL) || db.set(KEYS.LEVEL, 0);
        let lastxp = db.get(KEYS.COOLDOWN);
        let amount = (Math.floor(Math.random() * 5) + 15) * xprate;

        if (lastxp !== null && cooldown - (Date.now() - lastxp) > 0) return;

        let xp = db.add(`xp_${message.guild.id}_${message.author.id}`, amount);
        let nextlevel = level + 1;
        let previousrequired = db.get(KEYS.PREVIOUSLY_REQUIRED);

        if (!previousrequired) db.set(KEYS.PREVIOUSLY_REQUIRED, 0);
        let required = previousrequired + 50 * nextlevel;

        db.set(KEYS.REQUIRED_XP, required);
        db.set(KEYS.COOLDOWN, Date.now());
        db.get(KEYS.REQUIRED_XP) || db.set(REQUIRED_XP_KEY, 50);

        if (xp > required) {
            db.set(KEYS.PREVIOUSLY_REQUIRED, required);
            db.set(KEYS.LEVEL, nextlevel);

            if (!this.levelUpChannel && !this.dm) message.channel.send(this.substitute(message.author.tag, nextlevel)).then(m => m.delete({ timeout: 10000 }));
            if (this.levelUpChannel) {
                const channel = message.client.channels.cache.get(this.levelUpChannel);
                if (!channel) throw new XPError('Level up channel not found');
                channel.send(this.substitute(message.author.tag, nextlevel)).then(m => m.delete({ timeout: 10000 }));
            }
            if (this.dm) {
                try {
                    message.author.send(this.substitute(message.author.tag, nextlevel));
                } catch (e) {
                    if (this.noDM) {
                        const channel = message.client.channels.cache.get(this.noDM);

                        if (!channel) throw new XPError('No DM channel not found');

                        channel.send(this.substitute(message.author.tag, nextlevel)).then(m => m.delete({ timeout: 10000 }));
                    } else message.channel.send(this.substitute(message.author.tag, nextlevel)).then(m => m.delete({ timeout: 10000 }));
                }
            }
        }
    }

    /**
     * getLevel - Get Level of the Specified User
     * @param {object} message Message Object
     * @param {string} userid User ID
    */

    getLevel(message, userid) {
        if (!message.guild.id) throw new XPError('Guild ID is not valid!')
        if (!userid){        //throw new XPError('User ID was not provided!');
        return db.get(`level_${message.guild.id}_${message.author.id}`)
       }
       return db.get(`level_${message.guild.id}_${userid}`)
    }

    /**
    * getXP - Get XP of the Specified User
    * @param {object} message Message Object
    * @param {string} userid User ID 
    */

    getXP(message, userid) {
        if (!message.guild.id) throw new XPError('Guild ID is not valid!')
        if (!userid) {                      // throw new XPError('User ID was not provided!');
        return db.get(`xp_${message.guild.id}_${message.author.id}`)
    }
    return db.get(`xp_${message.guild.id}_${message.author.id}`)
}

    /**
    * leaderboard - leaderboard
    * @param {object} message Message Object
    * @param {object} options Options = { limit: 10, raw: false }
    * @param {number} [options.limit=10] Limit
    * @param {boolean} [options.raw=false] Raw
    * @returns leaderboard[]
    */
   leaderboard(message, options = { limit: 10, raw: false}) {
        const limit = options.limit || 10;
        const raw = options.raw || false;
        const final = [];
        if (!message.guild.id) throw new XPError("Guild ID is invalid!")
        if (isNaN(limit)) throw new XPError("Limit provided isn't a number!");
        
        let lb = db.fetchAll().filter(data => data.ID.startsWith(`xp_${message.guild.id}_`)).sort((a, b) => b.data - a.data);
        let i = 0;
        
        if (!(parseInt(limit) <= 0)) lb.length = parseInt(limit);
        if (raw) return lb;

        for (i in lb) {

            let obj = {
                position: lb.indexOf(lb[i]) + 1,
                id: lb[i].ID.split('_')[2],
                xp: lb[i].data,
            };
            final.push(obj);
        };
        return final;
    }

    /**
    * resetLevel - Reset The Level of a User
    * @param {object} message  Message Object
    * @param {string} userid User ID
    */
    resetLevel(message, userid) {
        if (!message.guild.id) throw new XPError('Guild ID is not valid!')
        if (!userid) throw new XPError('User ID was not provided!');
        db.delete(`xp_${message.guild.id}_${userid}`)
        db.delete(`level_${message.guild.id}_${userid}`)
        return `Data of "${userid}" for "${message.guild.id}" has been deleted. Their levels are reset.`
    }


    /**
    * reset - Delete the Database
    */

    reset() {
        console.log('The database was reset');
        db.all().forEach(m => db.delete(m.ID))
    }

    /**
     * Substitute Values In Level Up Message
     * @param {string} user 
     * @param {number} level 
     * @ignore
     * @private
     */
    substitute(user, level) {
        return this.levelUpMessage
            .replace('{{user}}', user)
            .replace('{{level}}', level);
    }

    /**
     * Validate Options
     * @param {object} options Options
     */
    validateOptions(options = {}) {
        if (options) {
            if (options.cooldown && isNaN(options.cooldown)) throw new XPError('[Options] Invalid Cooldown');
            if (options.levelUpMessage && typeof options.levelUpMessage !== "string") throw new XPError('[Options] Level Up Message must be of type string');
            if (options.levelUpChannel && typeof options.levelUpChannel !== "string") throw new XPError('[Options] Level Up Channel ID must be of type string');
            if (options.dm && typeof options.dm !== 'boolean') throw new XPError("[Options] Option 'DM' must be of type boolean");
            if (options.levelUpChannel && options.dm) throw new XPError('[Options] Cannot send message in two channels (DM & Level Up Channel)');
            if (options.noDM && typeof options.noDM !== 'string') throw new XPError("[Options] noDM channel ID must be a string");

            return true;
        } else return false;
    }

}

module.exports = SQLiteManager;
