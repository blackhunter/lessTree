#lessTree
```
Editing tool to rules inside less's tree object

npm install git://github.com/blackhunter/lessTree.git
```

## lessTree's methods:


### lessTree.loadStyle(path, callback)
* **path** - .less file's path
* **callback** - arguments: err, **sheet object**


### lessTree.mapLess(path, tree)
* **path** - .less file's path
* **tree** - object parsed with less.Parser

**return: sheet object**

### lessTree.toLess(path, tree)
* **path** - .less file's path
* **tree** - object parsed with less.Parser

**return: tree object converted back to less**


## sheet object
``` js
{
	list: [],				//list of selectors
	listOut: [],
	selectors: {},		//access to selectors object({rules: [], parent: {}}) by selector
	path: '',			//path to loaded file
	tree: {}			//object parsed with less.Parser
}
```

### sheet.saveStyle([cords, callback])
* **cords** - new localization path, default localization of loaded file or given in **lessTree.mapLess**
* **callback** - arguments: err


### sheet.editRule(selector, now[, old])
* **selector** - existing selector like: "div"
* **now** - object {name: 'color', value:'red'} - rule to add
* **old** - object {name: 'color'} - rule to delete


### sheet.editSelector(rule[, fromFile])
* **rule** - selector like 'div' or index of rule (to delete it)
* **fromFile** - if false, the selector will by pushed(or deleted) to listOut array of sheet object, else to list array


### sheet.toLess()

**return: tree object converted back to less**


## usage:
``` js
	var tl = require('lessTree');
	tl.loadStyle('c://somepath/somefile.less', function(err, sheet){
		if(err)
			throw err;
		else{
			sheet.editSelector('div a');	//now as last index of list array
			sheet.editRule('div a', {name: 'color', value: 'red!important'});	//and have "color" prop
			sheet.saveStyle();	//rewrite file
		}
	})
```
