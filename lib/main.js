var mainLess = require('less'),
	less = new (less.Parser),
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
	i;

//change names with hex
for(i in mainLess.tree.colors){
	colors[mainLess.tree.colors[i]] = i;
}

module.exports  = {
	editProp: function(sheet, selector, now, old){
		if(selector in sheet.selectors){
			var base = sheet.selectors[selector].rules;
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
			if(now){
				less.parse(now.name + ': '+ now.value, function(err, tree){
					base.push(tree.rules[0]);
				});
			}
		}
	},
	editRule: function(sheet, css, fromFile){
		var listType = (fromFile==false? 'listOut' : 'list');
		if(typeof css == 'number'){
			var toDel, i, selector;

			selector = sheet[listType][css];
			sheet[listType].splice(css,1);
			toDel = sheet.selectors[selector];
			delete sheet.selectors[selector];

			i = toDel.parent.length;
			while(i--){
				if(toDel.parent[i].rules == toDel.rules){
					toDel.parent.splice(i, 1);
					break;
				}
			}
		}else{
			if(css.substr(0, css.indexOf("{")) in sheet.selectors)
				return;

			var getSelector = this.selectorParser;
			less.parse(css, function(err, less){
				var startSelector = getSelector(less.rules[0]);

				if(less.rules[0].selectors.length==1){
					var ele = less.rules[0].selectors[0],
						startSelector = getSelector({selectors: [ele]}),
						now = ele,
						end = [],
						clone;

					while(true){	//ok
						if(!now.elements.length){
							break;
						}else if((selector = getSelector({selectors: [now]})) in sheet.selectors){
							if(/[\.\[\:]/.test(end[0].value[0])){
								clone = Object.create(end[0]);
								clone.value = '&';
								end.unshift(clone);
							}

							ele.elements = end;
							sheet.selectors[selector].rules.push(less.rules[0]);
							sheet[listType].push(startSelector);
							sheet.selectors[startSelector] = {
								rules: less.rules[0].rules,
								parent: sheet.selectors[selector]
							}
							return;
						}else{
							end.push(now.elements.pop())
						}
					}
				}

				//else
				sheet.selectors[startSelector] = {
					rules: less.rules[0].rules,
					parent: sheet.tree.rules
				}
				sheet[listType].push(startSelector);
				sheet.tree.rules.push(less.rules[0]);
			});
		}
	},
	mapLess: function(tree, list){
		var selectors = {},
			getSelector = this.selectorParser;

		function loop(rules, lastS){
			//selectors
			rules.forEach(function(ele){
				if('selectors' in ele){
					var sele = (lastS+getSelector(ele)).replace(' &','');

					if(list)
						list.push(sele);

					selectors[sele] = {
						rules: ele.rules,
						parent: rules
					}
					loop(ele.rules, sele+' ');
				}
			});
		}

		loop(tree.rules, '');
		return selectors;
	},
	selectorParser: function(ele){
		return ele.selectors.map(function(selector){
			return selector.elements.map(function(ele){
				return (ele.combinator.value=='+'? ' + ' : ele.combinator.value)+ele.value;
			}).join('').trim();
		}).join(', ');
	},
	loadStyle: function(path, cb){
		var self = this;
		fs.readFile(path, 'utf-8', function(err, file){
			if(!err){
				less.parse(file, function(err, less){
					if(!err){
						var sheet = {
							selectors: null,
							list: [],
							listOut: [],
							path: path,
							tree: less
						};

						sheet.selectors = self.mapLess(less, sheet.list)

						cb(null, sheet);
						return;
					}

					cb(err);
				});
			}else
				cb(err);
		});
	},
	saveStyle: function(obj, cb){
		fs.writeFile(obj.path, this.toLess(obj.tree), cb);
	},
	toLess: function(tree){
		endIgnore = false;
		currTabs = '';
		return trans.rules(tree.rules);
	}
};