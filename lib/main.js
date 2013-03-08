var mainLess = require('less'),
	less = new (mainLess.Parser),
	fs = require('fs'),
	colors = {},
	cap = {
		'ruleset': {t: ['features', 'name','silent'], def: 'value'},
		'val_end': {t:['rgb','value','name','operands'], def: 'value'},
		'lvalue': {t: ['name','unit','lvalue','operands'], def: 'value'},
		'operands': {t: ['rgb','name','unit'], def: 'value'},
		'rules': {t: ['path','features','arguments','args','selectors','name','silent'], def: 'value'},
		'value': {t: ['name','unit','value','operands','selector','rgb','variadic'], def:'value'},
		'args': {t: ['name','variadic','value'], def: 'name'},
		'name': {t: ['unit','value'], def:'value'}
	},
	diagnosis = function(obj, oInstance, params){
		var pick = cap[oInstance].def;
		cap[oInstance].t.some(function(ele){
			return (ele in obj)? pick =  ele : false;
		});

		if(pick){
			return trans[pick](obj, params);
		}else{
			console.log('undiagnosis element: ', obj, oInstance);
			return '';
		}
	},
	endIgnore = false,
	currTabs = '',
	trans = {
		level: function(){
			return (currTabs.length? '' : '\n');
		},
		tabs: function(up){
			if(up)
				currTabs += '\t';
			else
				currTabs = currTabs.substr(1);
			return currTabs;
		},
		endSep: function(one){
			if(one)
				endIgnore = true;
			else{
				var end = (endIgnore? '' : ';');
				if(endIgnore)
					endIgnore = false;
				return end;
			}
		},
		value: function(ele, inherent){
			if(typeof(ele) == 'string'){
				return ele;
			}else if(Array.isArray(ele)){
				return ele.map(function(ele){
					return diagnosis(ele, 'value', inherent);
				}).join(' ');
			}else if(ele && typeof(ele)=='object'){
				if('rootpath' in ele)
					return 'url('+this.specValue(ele, inherent)+')';
				else if('name' in ele){
					if(inherent=='media')
						return '('+this.name(ele, inherent)+')';
					else
						return	this.name(ele, inherent);
				}else if('value' in ele || 'expression' in ele){
					return this.specValue(ele, inherent);
				}else{
					return diagnosis(ele, 'val_end', inherent);
				}
			}
		},
		silent: function(ele){
			this.endSep(true);
			return ele.value.substr(0,ele.value.length-!ele.silent*1);
		},
		specValue: function(ele, inherent){
			if(ele.expression)
				var value = '`'+ele.expression+'`';
			else
				var value = this.value(ele.value, inherent);

			return (ele.escaped? '~' : '') + (ele.quote? ele.quote : '') + value + (ele.quote? ele.quote : '');
		},
		lvalue: function(con){
			var val = '',
				instance = /[><=]/.test(con.op);

			if(con.negate)
				val += 'not ';

			if(instance)
				val += '(';

			val += ['lvalue','rvalue'].map(function(sites){
				return diagnosis(con[sites], 'lvalue');
			}).filter(function(ele){	//remove unnecessary
					return ele!='true';
				}).join(' '+con.op+' ');

			if(instance)
				val += ')';
			return val;
		},
		operands: function(ele, last){
			var bracket = (!last || (!/[\+-]/.test(last) && /[\+-]/.test(ele.op)));
			return (bracket? '(' : '') + ele.operands.map(function(op){
				return diagnosis(op, 'operands', ele.op);
			}).join(' '+ele.op+' ') + (bracket? ')' : '');
		},
		rules: function(tab){
			var __self = this;

			return tab.map(function(rule){
				return currTabs+diagnosis(rule, 'rules')+__self.endSep();
			}).join('\n');
		},
		selectors: function(ruleset){
			var val = this.selector(ruleset.selector || ruleset.selectors);
			if('arguments' in ruleset)
				val += this.args(ruleset.arguments);
			if('params' in ruleset)
				val += this.args(ruleset.params);
			if('condition' in ruleset && ruleset.condition)
				val += ' when ' + trans.lvalue(ruleset['condition']);
			if('rules' in ruleset){
				this.tabs(true);
				val += ' {\n'+this.rules(ruleset.rules)+'\n'+this.tabs()+'}'+this.level();
				this.endSep(true);
			}

			return val;
		},
		selector: function(tab){
			if(!Array.isArray(tab))	tab = [tab];
			return tab.map(function(selector){
				return selector.elements.map(function(ele){
					return ele.combinator.value+(ele.value.name? '@{'+ele.value.name.substr(1)+'}' : ele.value);
				}).join('').trim();
			}).join(', ');
		},
		args: function(args){
			var __self = this;
			if(args.length)
				return '('+args.map(function(ele){
					return diagnosis(ele, 'args');
				}).join(', ')+')';
			else
				return '()';
		},
		variadic: function(){
			return '...';
		},
		rgb: function(ele){
			if(ele.alpha < 1.0){
				return "rgba(" + ele.rgb.map(function(part){
					return Math.round(part);
				}).concat(ele.alpha).join(', ') + ")";
			}else{
				var color = '#' + ele.rgb.map(function(part){
					part = Math.round(part);
					part = (part > 255 ? 255 : (part < 0 ? 0 : part)).toString(16);
					return part.length === 1 ? '0' + part : part;
				}).join('');
				return (color in colors)?colors[color] : color;
			}
		},
		name: function(ele){
			var val = '';

			if(ele.name)
				val += ele.name;

			if('value' in ele){
				if(val!='')
					val += ': ';
				val += diagnosis(ele.value ,'name');
			}else if('args' in ele){
				val += this.args(ele.args);
			}

			return val;
		},
		unit: function(ele){
			return ele.value+ele.unit;
		},
		arguments: function(arg){
			return this.selectors(arg);
		},
		features: function(parm){
			var val = '@media ';
			val += this.value(parm.features.value, 'media');
			val += ' {\n'+this.ruleset(parm.ruleset)+'\n'+this.tabs()+'}'+this.level();
			this.endSep(true);
			return val;
		},
		ruleset: function(ruleset){
			this.tabs(true);
			var __self = this;
			return ruleset.rules.map(function(rule){
				return currTabs+diagnosis(rule, 'ruleset')+__self.endSep();
			}).join('\n');
		},
		path: function(ele){
			var val = '@import';
			if(ele.once)
				val += '-once';
			val += ' ';
			val += this.specValue(ele._path);
			return val;
		}
	},
	selectorParser = function(ele){
		return ele.selectors.map(function(selector){
			return selector.elements.map(function(ele){
				return (ele.combinator.value=='+'? ' + ' : ele.combinator.value)+ele.value;
			}).join('').trim();
		}).join(', ');
	},
	rule = function(rules, parent){
		this.rules = rules;
		this.parent = parent;
	},
	sheet = function(path, tree){
		this.selectors = {};
		this.list = [];
		this.listOut = [];
		this.path = path;
		this.tree = tree;
	},
	i;

sheet.prototype.editProp = function(selector, now, old){
	if(selector in this.selectors){
		var base = this.selectors[selector].rules;
		old = (old? old : {name: now.name});
		//delete
		if(old){
			base.some(function(ele, index){
				if('name' in ele && ele.name==old.name){
					base.splice(index,1);
					return true;
				}
				return false;
			});
		}
		//add
		//delete on overwrites
		if(now){
			less.parse('a{'+now.name + ': '+ now.value+'}', function(err, tree){
				base.unshift(tree.rules[0].rules[0]);
			});
		}
	}
}

sheet.prototype.editRule = function(css, fromFile){
	var listType = (fromFile==false? 'listOut' : 'list');
	if(typeof css == 'number'){
		var toDel, i, selector;

		selector = this[listType][css];
		this[listType].splice(css,1);
		toDel = this.selectors[selector];
		delete this.selectors[selector];

		i = toDel.parent.length;
		while(i--){
			if(toDel.parent[i].rules == toDel.rules){
				toDel.parent.splice(i, 1);
				break;
			}
		}
	}else{
		if(css in this.selectors)
			return;

		var tree;
		less.parse(css+'{}', function(err, less){
			tree = less;
		});

		var startSelector = selectorParser(tree.rules[0]);

		if(tree.rules[0].selectors.length==1){
			var ele = tree.rules[0].selectors[0],
				startSelector = selectorParser({selectors: [ele]}),
				now = ele,
				end = [],
				clone;

			while(true){	//ok
				if(!now.elements.length){
					break;
				}else if((selector = selectorParser({selectors: [now]})) in this.selectors){
					if(end[0].combinator.value=='' && /[\.\[\:]/.test(end[0].value[0])){
						clone = Object.create(end[0]);
						clone.value = '&';
						end.unshift(clone);
					}

					ele.elements = end;
					this.selectors[selector].rules.push(tree.rules[0]);
					this[listType].push(startSelector);
					this.selectors[startSelector] = new rule(tree.rules[0].rules, this.selectors[selector]);
					return;
				}else{
					end.push(now.elements.pop())
				}
			}
		}

		//else
		this.selectors[startSelector] = new rule(tree.rules[0].rules, this.tree.rules);
		this[listType].push(startSelector);
		this.tree.rules.push(tree.rules[0]);
	}
}

sheet.prototype.save = function(path, cb){
	if(typeof path == 'function'){
		cb = path;
		path = this.path
	}

	fs.writeFile(path, this.toLess(), cb);
}

sheet.prototype.toLess = function(){
	endIgnore = false;
	currTabs = '';

	return trans.rules(this.tree.rules);
}

sheet.prototype.toCSS = function(){
	return this.tree.toCSS();
}

//change names with hex
for(i in mainLess.tree.colors){
	colors[mainLess.tree.colors[i]] = i;
}

module.exports  = {
	map: function(path, tree){
		var
			sheetNew = new sheet(path, tree),
			sele;

		function loop(rules, lastS){
			rules.forEach(function(ele){
				if('selectors' in ele){
					sele = (lastS+selectorParser(ele)).replace(' &','');

					sheetNew.list.push(sele);
					sheetNew.selectors[sele] = new rule(ele.rules, rules);
					loop(ele.rules, sele+' ');
				}
			});
		}

		loop(tree.rules, '');
		return sheetNew;
	},
	load: function(path, cb){
		var self = this;
		fs.readFile(path, 'utf-8', function(err, file){
			if(!err){
				less.parse(file, function(err, less){
					if(!err){
						cb(null, self.map(path, less));
						return;
					}

					cb(err);
				});
			}else
				cb(err);
		});
	},
	toLess: function(tree){
		endIgnore = false;
		currTabs = '';

		return trans.rules(tree.rules);
	}
};
