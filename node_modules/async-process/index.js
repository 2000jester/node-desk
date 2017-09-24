/* 
 * Copyright (C) 2017 Alexis
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

/**
 * @typedef {Function} asyncProcess.taskCallback    The callback called for every task supplied.
 * @param {any} value    The value to be processed
 * @param {asyncProcess.onError|function} callback The callback when the task is completed
 */


/**
 * Object used to handle async process.
 * @param {Array} tasks An array of data. Each entry will be processed async.
 * @param {asyncProcess.taskCallback} taskCallback function that will be called for each value in the tasks.
 * the value as the first parameter and the callback as the second one.
 * @param {Function} onFinish  The finish callback function
 * @constructor
 */
var asyncProcess = function (tasks, taskCallback, onFinish) {
    this._count = 0;

    /**
     * @public
     * The task that have failed
     * @type {Array}
     */
    this.tasksFails = [];


    this._id = (new Date()).getTime();
    this._expectedCount = tasks.length;
    if (onFinish && typeof onFinish == "function")
        this.onFinish = onFinish;

    var that = this;
    tasks.forEach(function (task) {
        taskCallback(task, function (err, name) {
            //Call the correct handler
            that._count++;
            err ? that.onError(err, name) : that.onTaskFinish();
            if (that._count == that._expectedCount)
                that.onFinish();
        })
    }, this);
};
/**
 * Default onFinish function called after the tasks are completed.
 */
asyncProcess.prototype.onFinish = function () {
    console.log("Updated process " + this._id + " is completed");
    if (this.tasksFails.length > 0)
        console.warn("Few tasks failed to process :" + this.tasksFails.join(','));
};


/**
 * The callback called when the task is processed and failed
 * @param {Object}  err The error that occured.
 * @param {string|number|null} name    The name of the task. Can be useful to debug.
 */
asyncProcess.prototype.onError = function (err, name) {
    if (!name)
        name = (new Date()).getTime();
    this.tasksFails.push(name);

};

/**
 * Function that need to be called after every task is done.
 */
asyncProcess.prototype.onTaskFinish = function () {
    //Add something here?
};

module.exports = asyncProcess;