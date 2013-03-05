#lessTree
```
Tool to editing rules inside less's tree object

npm install https://github.com/blackhunter/lessTree.git
```

## metody:

### lessTree.loadStyle(path, callback)
* **path** - .less file's path
* **callback** - arguments: err, tree

``` js
return "sheet" object:
{
	list: [],				//list of selectors
	listOut: [],
	selectors: {},	//access to selectors object({rules: [], parent: {}}) by selector
	path: '',			//path to loaded file
	tree: {}			//object parsed with less.Parser
}
```

### lessTree.saveStyle(cords[, callback])
* **cords** - sheet object(for overwrite existing file) or new localization path
* **callback** - arguments: err


### lessTree.editProp(sheet, selector, now[, old])
* **sheet** - "sheet" object
* **selector** - existing selector like: "div"
* **now** - object {name: 'color', value:'red'} - rule to add
* **old** - object {name: 'color'} - rule to delete


### lessTree.addRule(sheet, rule[, fromFile])
* **sheet** - "sheet" object
* **rule** - selector like 'div' or index of rule (to delete it)
* **fromFile** - if false, the rule will by pushed(or deleted) to listOut array of sheet object, else to list array


użycie:
``` js
	var tl = require('lessTree');
	tl.loadStyle('c://somepath/somefile.less', function(err, sheet){
		if(err)
			throw err;
		else{
			tl.addRule(sheet, 'div a');	//now last index of list array
			tl.editProp(sheet, 'div a', {name: 'color', value: 'red!important'});	//now have "color" prop
			tl.saveStyle(sheet);	//save changes
		}
	})
```
