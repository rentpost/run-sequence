/*jshint node:true */

"use strict";

var colors = require('chalk');


module.exports = RunSequence;


/**
 * RunSequence Constructor
 * @param {object} gulp		Pass gulp to the constructor for dependency handling
 * @constructor
 */
function RunSequence(gulp) {
	if(!(this instanceof RunSequence))
		return new RunSequence(gulp);

	this._gulp = gulp || require('gulp');
}


/**
 * Starts the actual execution of the sequence of tasks via Orchestrator
 * @param {Array} taskSets
 * @param {function} callback
 */
RunSequence.prototype.start = function(taskSets, callback) {
	var self = this,
		currentTaskSet;

	taskSets = taskSets || [];
	callback = typeof callback === 'function' ? callback : false;

	var finish = function (err) {
			self._gulp.removeListener('task_stop', onTaskEnd);
			self._gulp.removeListener('task_err', onError);
			if(callback) {
				callback(err);
			} else if (err) {
				console.log(colors.red('Error running task sequence:'), err);
			}
		},

		onError = function (err) {
			finish(err);
		},

		onTaskEnd = function (event) {
			var idx = currentTaskSet.indexOf(event.task);
			if (idx > -1) {
				currentTaskSet.splice(idx, 1);
			}
			if (currentTaskSet.length === 0) {
				runNextSet();
			}
		},

		runNextSet = function () {
			if (taskSets.length) {
				var command = taskSets.shift();
				if (!Array.isArray(command)) {
					command = [command];
				}
				currentTaskSet = command;
				self._gulp.start.apply(self._gulp, command);
			} else {
				finish();
			}
		};

	this.verifyTaskSets(taskSets);

	self._gulp.on('task_stop', onTaskEnd);
	self._gulp.on('task_err', onError);

	runNextSet();
};


/**
 * Verification of the task sets provided
 * @param taskSets
 * @param skipArrays
 */
RunSequence.prototype.verifyTaskSets = function(taskSets, skipArrays) {
	var self = this;

	if(taskSets.length === 0) {
		throw new Error('No tasks were provided to run-sequence');
	}

	var foundTasks = {};
	taskSets.forEach(function(t) {
		var isTask = typeof t === "string",
			isArray = !skipArrays && Array.isArray(t);
		if(!isTask && !isArray) {
			throw new Error("Task "+t+" is not a valid task string.");
		}
		if(isTask && !self._gulp.hasTask(t)) {
			throw new Error("Task "+t+" is not configured as a task on gulp.");
		}
		if(skipArrays && isTask) {
			if(foundTasks[t]) {
				throw new Error("Task "+t+" is listed more than once. This is probably a typo.");
			}
			foundTasks[t] = true;
		}
		if(isArray) {
			if(t.length === 0) {
				throw new Error("An empty array was provided as a task set");
			}
			self.verifyTaskSets(t, true, foundTasks);
		}
	});
};