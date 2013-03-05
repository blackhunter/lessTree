var
	LT = require('../lib/main.js'),
	assert = require('assert'),
	fs = require('fs');

LT.loadStyle(__dirname+'/test.less', function(err, tree){
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

	LT.editProp(tree, selector, {name: 'color', value:'blue'});
	LT.editProp(tree, selector, {name: 'color', value:'green'});
	LT.editProp(tree, selector, {name: 'border', value:'1px solid black'});
	LT.editProp(tree, selector, null, {name: 'color'});


	assert.equal((len+1), tree.selectors[selector].rules.length);
	assert(tree.selectors[selector].rules.some(function(ele){
		return (ele.name=='border');
	}));

	//editRule tests
		var
			lenA = tree.list.length,
			lenB = tree.listOut.length;

	LT.editRule(tree, 'div')
	assert.equal(lenA, tree.list.length);
	LT.editRule(tree, 'div a')
	assert.equal(lenA, tree.list.length);
	LT.editRule(tree, 'div a:hover')
	assert.equal(lenA+1, tree.list.length);
	LT.editRule(tree, 'div .class')
	assert.equal(lenA+2, tree.list.length);
	LT.editRule(tree, 'div.class')
	assert.equal(lenA+3, tree.list.length);
	LT.editRule(tree, 'div, a')
	assert.equal(lenA+3, tree.list.length);
	LT.editRule(tree, 'div, a div')
	assert.equal(lenA+4, tree.list.length);
	LT.editRule(tree, 'div a', false);
	assert.equal(lenB, tree.listOut.length)
	LT.editRule(tree, 'div a:cover', false)
	assert.equal(lenB+1, tree.listOut.length);

	LT.editRule(tree, 2);
	assert.equal(lenA+3, tree.list.length);
	LT.editRule(tree, 0, false);
	assert.equal(lenB, tree.listOut.length);

	//tree check
	var
		expected = fs.readFileSync(__dirname+'/expected.less', 'utf-8').replace(/\s/g,''),
		result = LT.toLess(tree).replace(/\s/g,'');

	assert.equal(expected, result);
})
