var
	lt = require('../lib/main.js'),
	assert = require('assert'),
	less =  new (require('less').Parser),
	fs = require('fs');

lt.loadStyle(__dirname+'/test.less', function(err, tree){
	//load and mapLess tests
	assert('list' in tree);
	assert.equal(tree.list.length, 3);

	assert('listOut' in tree);
	assert.equal(tree.listOut.length, 0);

	assert('path' in tree);
	assert.equal(__dirname+'/test.less', tree.path);

	assert('selectors' in tree);
	assert.equal(Object.keys(tree.selectors).length, tree.list.length);

	tree.list.forEach(function(ele){
		assert(ele in tree.selectors);
	});

	//editProp test
	var
		selector = tree.list[0],
		len = tree.selectors[selector].rules.length;

	tree.editProp(selector, {name: 'color', value:'blue'});
	tree.editProp(selector, {name: 'color', value:'green'});
	tree.editProp(selector, {name: 'border', value:'1px solid black'});
	tree.editProp(selector, null, {name: 'color'});


	assert.equal((len+1), tree.selectors[selector].rules.length);
	assert(tree.selectors[selector].rules.some(function(ele){
		return (ele.name=='border');
	}));

	//editRule tests
		var
			lenA = tree.list.length,
			lenB = tree.listOut.length;

	tree.editRule('div')
	assert.equal(lenA, tree.list.length);
	tree.editRule('div a')
	assert.equal(lenA, tree.list.length);
	tree.editRule('div a:hover')
	assert.equal(lenA+1, tree.list.length);
	tree.editRule('div .class')
	assert.equal(lenA+2, tree.list.length);
	tree.editRule('div.class')
	assert.equal(lenA+3, tree.list.length);
	tree.editRule('div, a')
	assert.equal(lenA+3, tree.list.length);
	tree.editRule('div, a div')
	assert.equal(lenA+4, tree.list.length);
	tree.editRule('div a', false);
	assert.equal(lenB, tree.listOut.length)
	tree.editRule('div a:cover', false)
	assert.equal(lenB+1, tree.listOut.length);

	tree.editRule(2);
	assert.equal(lenA+3, tree.list.length);
	tree.editRule(0, false);
	assert.equal(lenB, tree.listOut.length);

	//tree check
	var
		expected = fs.readFileSync(__dirname+'/expected.less', 'utf-8').replace(/\s/g,''),
		result = tree.toLess().replace(/\s/g,'');

	assert.equal(expected, result);

	//reverse's parser precise test
	var i = 1,
		test, result, j;

	while(true){
		if(fs.existsSync(__dirname+'/results/result'+i+'.less')){
			test = fs.readFileSync(__dirname+'/results/result'+i+'.less', 'utf-8');
			less.parse(test, function(err, tree){
				result = lt.toLess(tree);
			});
			result = result.replace(/\r\n/g, '\n').split('\n');
			test = test.replace(/\r\n/g, '\n').split('\n');
			j = test.length;
			while(j--){
				assert.equal(test[j],result[j],'Test case nr: '+i+' line: '+j+'\n'+test[j]+' != '+result[j]);
			}
			i++;
		}else{
			break;
		}
	}

	console.log('\033[32mAll tests passed!\u001b[0m');
});