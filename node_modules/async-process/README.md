# async-process

A minimalist Node.js module that let you perform multiples async tasks. Once they are completed, you can call a callback function.

##Example

To run the example, simply run the `npm run example` in the root directory.

Example :

```javascript
var asyncProcess = require("async-process");
var fs = require("fs");
var loadedData = {};
var filesToLoad = ["./example/file1.json", "./example/file2.json", "./example/file3.json"];
var filesCb = function (val, cb) {
    fs.readFile(val, function (err, data) {
            if (!err)
                loadedData[val] = data;
            cb(err,val); //Pass null if not error.
        }
    );
};

new asyncProcess(filesToLoad, filesCb, function () {
    //At this point all the files are loaded
    console.log("All files have been processed");
    console.log("\nFile 3 should fail.");
    this.tasksFails.forEach(function(id){
        console.warn("Task : "+id+" failed.");
    })
});
```

--- 

#Documentation

<a name="asyncProcess"></a>


* [asyncProcess](#asyncProcess)
    * [new asyncProcess(tasks, taskCallback, onFinish)](#new_asyncProcess_new)
    * _instance_
        * [.tasksFails](#asyncProcess+tasksFails) : <code>Array</code>
        * [.onFinish()](#asyncProcess+onFinish)
        * [.onError(err, name)](#asyncProcess+onError)
        * [.onTaskFinish()](#asyncProcess+onTaskFinish)
    * _static_
        * [.taskCallback](#asyncProcess.taskCallback) : <code>function</code>

<a name="new_asyncProcess_new"></a>

### new asyncProcess(tasks, taskCallback, onFinish)
Object used to handle async process.


| Param | Type | Description |
| --- | --- | --- |
| tasks | <code>Array</code> | An array of data. Each entry will be processed async. |
| taskCallback | <code>[taskCallback](#asyncProcess.taskCallback)</code> | function that will be called for each value in the tasks. the value as the first parameter and the callback as the second one. |
| onFinish | <code>function</code> | The finish callback function |

<a name="asyncProcess+tasksFails"></a>

### asyncProcess.tasksFails : <code>Array</code>
**Kind**: instance property of <code>[asyncProcess](#asyncProcess)</code>  
**Access:** public  
<a name="asyncProcess+onFinish"></a>

### asyncProcess.onFinish()
Default onFinish function called after the tasks are completed.

**Kind**: instance method of <code>[asyncProcess](#asyncProcess)</code>  
<a name="asyncProcess+onError"></a>

### asyncProcess.onError(err, name)
The callback called when the task is processed and failed

**Kind**: instance method of <code>[asyncProcess](#asyncProcess)</code>  

| Param | Type | Description |
| --- | --- | --- |
| err | <code>Object</code> | The error that occured. |
| name | <code>string</code> &#124; <code>number</code> &#124; <code>null</code> | The name of the task. Can be useful to debug. |

<a name="asyncProcess+onTaskFinish"></a>

### asyncProcess.onTaskFinish()
Function that need to be called after every task is done.

**Kind**: instance method of <code>[asyncProcess](#asyncProcess)</code>  
<a name="asyncProcess.taskCallback"></a>

### asyncProcess.taskCallback : <code>function</code>
The callback called for every task supplied.

**Kind**: static typedef of <code>[asyncProcess](#asyncProcess)</code>  

| Param | Type | Description |
| --- | --- | --- |
| value | <code>any</code> | The value to be processed |
| callback | <code>asyncProcess.onError</code> &#124; <code>function</code> | The callback when the task is completed |

