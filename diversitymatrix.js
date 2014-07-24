(function() {

	// configuration variables
	var data_url = './people.csv';
	var stylesheet_url = './diversitymatrix.css'
	var target_div = '#journalismdiversity';
	var end_date = new Date(2014, 7);

	var dvmx = {},
		error,
		div = d3.select('div' + target_div),
		svg,
		wrapper,
		grid = 10,
		margin = {top: grid, right: grid, bottom: grid * 3, left: grid},
		legend_height = 0,
		total_height = div.style('height').replace('px', ''),
		total_width = div.style('width').replace('px', ''),
		height = total_height - margin.top - legend_height - margin.bottom,
		width = total_width - margin.left - margin.right,
		chart,
		legend,
		legend_labels,
		connections,
		mode = 'timeline',
		people,
		people_list,
		people_flat = [],
		person,
		person_rect,
		duration = 1000,
		organizations_flat = [],
		organizations_by_date = {},
		people_by_organization = {},
		organization_width,
		label_font_size,
		label_font_size_coefficient = 0.5, 
		staggers,
		timeline_x,
		timeline_y,
		group_x,
		clicks = 0,
		click_init = false,
		earliest_year,
		chronological_limit = end_date || new Date();
		dvmx = {};

		// neatly nest all utility functions here
		dvmx.helpers = {};

		// redraw any item as the front layer of the SVG
		d3.selection.prototype.move_to_front = function() {
		  return this.each(function() {
		    this.parentNode.appendChild(this);
		  });
		};

	// set up the playground
	dvmx.setup = function setup(error, callback) {		
		if (error) {
			return new Error('could not set up DOM and SVG');
		}
		svg = div.append('svg');
		wrapper = svg.append('g').classed('wrapper', true);
		wrapper.attr('transform', 'translate(' + grid + ',' + grid + ')');
	}
	// text labels
	dvmx.legend = {}
	dvmx.legend.setup = function setup_legend(error) {
		if (error) {
			return new Error('could not set up legend');
		}
		legend = wrapper.append('g').attr('id', 'legend');
		legend_labels = legend.append('g').attr('id', 'legend-labels');
	}
	dvmx.legend.clear = function clear_legend(error) {
		if (error) {
			return new Error('could not clear legend');
		}
		legend.selectAll('g.header').remove();
	}
	// write text labels for any qualities into which we're
	// sorting the people. input argument must be an array
	// consisting of exactly two groups which must be contained
	// in the same property name
	dvmx.legend.groups = function legend_group(groups) {
		// remove existing legend
		dvmx.legend.clear(error);
		dvmx.legend.fade(error);
		// set up groups and transforms
		var group_header = legend_labels.selectAll('g.header.group')
			.data(groups)
				.enter()
					.append('g')
						.attr('class', function(d, i) {
							var classes = ['header'];
							var classes_string;
							classes.push('group');
							classes_string = classes.join(' ');
							return classes_string;
						})
						.attr('id', function(d, i) {
							return d.toLowerCase().replace(/ /g, '-');
						})
						.attr('transform', function(d, i) {
							var translate_string;
							var translate_y = total_height / 2;
							var translate_x;
							// position on either the right or the left
							groups.indexOf(d) === 0 ? translate_x = width * 0.20 : translate_x = width * 0.80;
							translate_string = 'translate(' + translate_x + ',' + translate_y + ')';
							return translate_string;
						});
		// render text content
		var group_header_text = group_header
			.append('text')
				.attr('text-anchor', 'middle')
				.text(function(d, i) {
					return d;
				})
				.style('font-size', label_font_size + 'px');

	}
	// slight fade effect so the labels don't appear until the blocks
	// are done moving around
	dvmx.legend.fade = function fade_legend(error) {
		if (error) {
			return new Error('could not fade in legend');
		}
		legend.style('opacity', 0);
		legend.transition().duration(duration).style('opacity', 1);
	}
	// legend for timeline view, with sideways text labels
	dvmx.legend.timeline = function legend_timeline() {
		// remove existing legend
		dvmx.legend.clear();
		dvmx.legend.fade();
		// set up groups and transforms
		var timeline_header = legend_labels.selectAll('g.header.organization')
			.data(organizations_flat)
				.enter()
					.append('g')
						.attr('class', function(d, i) {
							var classes = ['header'];
							var classes_string;
							classes.push('organization');
							classes_string = classes.join(' ');
							return classes_string;
						})
						.attr('id', function(d, i) {
							return d.toLowerCase().replace(/ /g, '-');
						})
						.attr('transform', function(d, i) {
							var transforms = [];
							var translate_string;
							var transforms_string;
							var translate_y = total_height / 2;
							var translate_x = i * organization_width + organization_width / 2 + (organization_width - (label_font_size + (label_font_size * 0.25)));
							translate_string = 'translate(' + translate_x + ',' + translate_y + ')';
							transforms.push(translate_string);
							transforms.push('rotate(270)');
							transforms_string = transforms.join(' ');
							return transforms_string;
						})
						.style('font-size', label_font_size + 'px');
		// render text
		var timeline_header_text = timeline_header
			.append('text')
				.attr('text-anchor', 'middle')
				.text(function(d, i) {
					return d;
				});
	}
	// wrapper function for legends
	dvmx.render_legend = function render_legend(error) {
		if (error) {
			return new Error('could not run legend wrapper');
		}
		dvmx.legend.setup();
	}
	// add stylesheet to header
	dvmx.add_styles = function add_styles(error) {
		if (error) {
			return new Error('could not add stylesheet to page head');
		}
		d3.select('head').append('link')
			.attr('rel', 'stylesheet')
			.attr('type', 'text/css')
			.attr('href', stylesheet_url);
	}
	// read stroke color from a block and return an appropriately
	// modified darker shade to use for surrounding stroke
	dvmx.helpers.stroke_color = function stroke_color(d) {		
		var selector_string = '.' + d.race + '.' + d.gender;
		var fill_color_hex = d3.select('g' + selector_string + ' rect').style('fill');
		var stroke_color = d3.rgb(fill_color_hex).darker(0.5).toString();
		return stroke_color;
	}
	// compile a full name from an object representing a person
	dvmx.helpers.get_full_name = function get_full_name(d) {
		var full_name_array = [];
		var full_name = ''
		full_name_array.push(d.first_name);
		if (d.middle_name) {
			full_name_array.push(d.middle_name);
		}
		full_name_array.push(d.last_name);
		full_name = full_name_array.join(' ');
		return full_name;
	}
	// count total years of term
	dvmx.helpers.count_total_years = function count_total_years() {
		var total_years = {'male': 0, 'female': 0, 'white': 0, 'non-white': 0};
		var i;
		var j;
		var person;
		var quality;
		var start;
		var finish;
		var milliseconds_per_year
		for (var i = 0; i < people_flat.length; i++) {
			person = people_flat[i];
			start = dvmx.helpers.parse_date(person.start);
			end = dvmx.helpers.parse_date(person.end) || chronological_limit;
			difference = end - start;
			for(var j in total_years) {
				if(
					(person['race'] === j) ||
					(person['gender'] === j)
				) {
					total_years[j] += difference;
				}
			}
		}
		for (var k in total_years) {
			total_years[k] = total_years[k] / (1000 * 60 * 60 * 24 * 365);
		}
		console.log(total_years);
	}
	// collapse various properties into a unique identifier for a block
	dvmx.helpers.get_person_key = function get_person_key(d, i) {
		var person_key = '';
		person_key += d.first_name + '-' + d.last_name;
		person_key = person_key.toLowerCase() + '-' + d.organization.replace(/ /g, '-').toLowerCase();
		if (i) {
			person_key += '-' + i;
		}
		return person_key
	}
	// parse all dates using D3 helper functions instead of quirky native
	// JavaScript date handling
	dvmx.helpers.parse_date = function parse_date(date_string) {
		var date_object;
		var date_format = d3.time.format("%m/%Y");
		if (date_string === 'present') {
			date_string = '07/2014';
		}
		if(date_string.indexOf('/') == -1) {
			date_string = '01/' + date_string;
		}
		date_object = date_format.parse(date_string);
		return date_object;
	}
	// render a block per person, colored according to their
	// demographics and sized according to the length of their
	// term. positioning will be handled separately to allow
	// for easier and more flexible animation.
	dvmx.render_blocks = function render_timeline(error) {
		if (error) {
			return new Error('could not render blocks');
		}
		chart = wrapper.append('g').attr('id', 'chart');
		chart.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
		people = chart.append('g').attr('id', 'people');
		person = people.selectAll('g.people')
			.data(people_list)
				.enter()
					.append('g');
						person.attr('id', dvmx.helpers.get_person_key);
						person.attr('class', function(d, i) {
							var classes = ['person'];
							var name_key = dvmx.helpers.get_full_name(d).replace(/ /g, '-').toLowerCase();
							classes.push(d.race);
							classes.push(d.gender);
							classes.push(d.organization.toLowerCase().replace(/ /g, '-'));
							classes.push(name_key);
							classes_string = classes.join(' ');
							return classes_string;
						});
						person_rect = person.append('rect');
						person_rect
							.attr('width', (width / organizations_flat.length))
							.attr('height', function(d, i) {
								var rect_height;
								var person_key;
								var start = dvmx.helpers.parse_date(d.start);
								var end = dvmx.helpers.parse_date(d.end);
								if(start && end) {
									rect_height = dvmx.scales.timeline_y(end) - dvmx.scales.timeline_y(start);
								}
								person_key = dvmx.helpers.get_person_key(d);
								return rect_height;
							})
							.attr('stroke', dvmx.helpers.stroke_color)
		dvmx.redraw_blocks(error);
	}
	// redraw minority blocks at the front of the SVG so their strokes
	// overlap all the white males
	dvmx.redraw_blocks = function redraw_blocks(error) {
		if (error) {
			return new Error('could not redraw blocks');
		}
		d3.selectAll('g.person.non-white').move_to_front();
		d3.selectAll('g.person.female').move_to_front();
	}
	// prep all data
	dvmx.dataprep = function dataprep(error, data) {
		if (error) {
			return new Error('could not prepare data');
		}
		var old_date, new_date;
		var person_name;
		var total_years = 0;
		var year_compare_end, year_compare_start;
		var person, organization;
		// sort people chronologically
		people_list = data.sort(function(a, b) {
			return a.start - b.start;
		});
		// master loop to set up as much as possible based on the
		// sorted list of people
		for (var i in people_list) {
			person = people_list[i];
			year_compare_start = person.start;
			person_key = dvmx.helpers.get_person_key(person);
			person_name = dvmx.helpers.get_full_name(person);
			// add to flat list of people
			people_flat.push(person);
			// sort people by organization
			organization = person.organization;
			if (!people_by_organization[organization]) {
				people_by_organization[organization] = [];
			}
			people_by_organization[organization].push(person);
			if (!organizations_by_date[organization]) {
				organizations_by_date[organization] = person.start;
			} else {
				old_date = organizations_by_date[organization];
				new_date = person.start;
				if(old_date > new_date) {
					organizations_by_date[organization] = new_date;
				}
			}
		}
		// sort people per organization chronologically; this may
		// be redundant, but it's better to be sure when constructing
		// the timeline view
		for (var i in people_by_organization) {
			people_by_organization[i].sort(function(a, b) {
				return a.start - b.start;
			});
			// add to flat list of organizations
			organizations_flat.push(i);
		}
		// sort flat list of organizations according to founding date
		organizations_flat.sort(function(a, b) {
			var a_start = d3.min(people_by_organization[a], function(item) {
				var date = item.start;
				var date_parsed = dvmx.helpers.parse_date(date).getFullYear();
				return date_parsed;
			});
			var b_start = d3.min(people_by_organization[b], function(item) {
				var date = item.start;
				var date_parsed = dvmx.helpers.parse_date(date).getFullYear();
				return date_parsed;
			});
			return a_start - b_start;
		});
		// width of all blocks/bars is consistent
		organization_width = width / organizations_flat.length;
		// dynamically adjust label font size based on the number of
		// organizations
		label_font_size = organization_width * label_font_size_coefficient;
		// sort people by start date of their term
		people_flat.sort(function(a, b) {
			return a.start - b.start;
		});
		// find the earliest year represented in the list of people
		// so we know how far back the timeline view must extend
		earliest_year = dvmx.helpers.parse_date(people_flat[0].start).getFullYear();
	}
	dvmx.scales = {};
	// scales for positioning
	dvmx.define_scales = function define_scales(error) {
		if (error) {
			return new Error('could not define scales');
		}
		var start = dvmx.helpers.parse_date(earliest_year.toString());
		var finish = chronological_limit;
		dvmx.scales.timeline_x = d3.scale.ordinal().domain(organizations_flat).rangeBands([0, width]);
		dvmx.scales.timeline_y = d3.time.scale().domain([start, finish]).range([0, height]);
	}
	// get data from source file and run all further rendering as a callback
	dvmx.fetch = function fetch(error, callback) {
		if(error) {
			return new Error('could not fetch data');
		}
		d3.csv(data_url, callback);
	}
	// render everything once the data has been retrieved
	dvmx.render = function render(error, data) {
		if (error) {
			return new Error('could not run rendering wrapper');
		}
		dvmx.dataprep(error, data);
		dvmx.define_scales(error);
		dvmx.render_blocks(error);
		dvmx.render_legend(error);
		dvmx.spotlight_switcher(error);
		if (clicks === 0) {
			dvmx.timeline(error);
			dvmx.track_clicks(error);
		}
	}
	// toggle spotlights on mouseover
	dvmx.spotlight_switcher = function spotlight_switcher(error, data) {
		if (error) {
			return new Error('could not launch popup');
		}
		var spotlight;
		person.on('mouseover', function add_spotlight(d, i) {
			var start = {};
			var current = d3.select(this);
			var current_bounds = current.node().getBBox();
			var current_rect = current.select('rect.person');
			var spotlight_rect;
			var spotlight_text;
			var spotlight_position = {};
			var spotlight_text_position = {};
			var spotlight_name;
			var spotlight_organization;
			var spotlight_start;
			var spotlight_separator;
			var spotlight_end;
			var full_name_array = [];
			var full_name = '';
			var overflow = {};
			var start_date = dvmx.helpers.parse_date(d.start)
			var end_date = dvmx.helpers.parse_date(d.end);
			var tenure_in_ms = end_date - start_date;
			var tenure_in_years = tenure_in_ms / (1000 * 60 * 60 * 24 * 365);
			var month_names = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
			// draw wrapper
			spotlight = wrapper
				.append('g')
					.attr('id', 'spotlight')
					.move_to_front();
			// background
			spotlight_rect = spotlight.append('rect');
			// outline
			spotlight_rect
				.attr('stroke', function() {
					var color = dvmx.helpers.stroke_color(d);
					return color;
				});
			// text content
			spotlight_text = spotlight
				.append('g');
			full_name = dvmx.helpers.get_full_name(d);
			spotlight_name = spotlight_text
				.append('text')
					.attr('id', 'spotlight-name')
					.text(full_name);
			spotlight_organization = spotlight_text
				.append('text')
					.attr('id', 'spotlight-organization')
					.text(d.organization);
			spotlight_start = spotlight_text
				.append('text')
					.attr('id', 'spotlight-start')
					.attr('class', 'date')
					.text(function() {
						var start_string = '';
						if (
							(tenure_in_years < 1) && (d.end !== 'present')
						) {
							start_string += month_names[start_date.getMonth()] + ' ';
						}
						start_string += start_date.getFullYear().toString();
						return start_string;
					});
			spotlight_separator = spotlight_text
				.append('text')
					.attr('id', 'spotlight-separator')
					.text('~');
			spotlight_end = spotlight_text
				.append('text')
					.attr('id', 'spotlight-end')
					.attr('class', 'date')
					.text(function() {
						if(d.end.toLowerCase() === 'present') {
							return d.end;
						}
						var end_string = '';
						if (tenure_in_years < 1) {
							end_string += month_names[end_date.getMonth()] + ' ';
						}
						end_string += end_date.getFullYear();
						return end_string;
					});
			spotlight_text.selectAll('text')
				.attr('text-anchor', 'middle');
			// space out each line vertically within the text group
			// wrapper
			spotlight_text.selectAll('text').each(function(d, i) {
				d3.select(this)
					.attr('y', (i + 1) * grid * 2);
			});
			// position text box relative to the block associated
			// with it
			spotlight_text_position = spotlight_text.node().getBBox();
			spotlight_position.x = current_bounds.x;
			spotlight_position.y = current_bounds.y;
			// flip top/bottom and left/right anchoring so the spotlight always
			// renders in the inverse position of the chart quadrant where the 
			// associated block is currently located
			if (spotlight_position.x > width / 2) {
				spotlight_position.x += (spotlight_text_position.width) * -1
			} else {
				spotlight_position.x += organization_width + (grid * 2);
			}
			if (spotlight_position.y > height / 2) {
				spotlight_position.y += -1 * (spotlight_text_position.height) + current_bounds.height;
			} else {
				spotlight_position.y += grid;
			}
			// slightly adjust positioning of the spotlight so it can never overflow the
			// overall boundaries of the chart
			overflow.x = spotlight_position.x + spotlight_text_position.width > width - grid;
			overflow.y = spotlight_position.y + spotlight_text_position.height > height - grid;		
			if (overflow.x) {
				spotlight_position.x = width - spotlight_text_position.width - grid - ((organizations_flat.length - organizations_flat.indexOf(d.organization)) * organization_width);
			}
			if (overflow.y) {
				spotlight_position.y = (height - spotlight_text_position.height - grid);
			}
			// position text over the background rectangle
			spotlight_text
				.attr('transform', 'translate(' + spotlight_text_position.width / 2 + ',0)');
			spotlight
				.attr('class', function() {
					var classes = ['spotlight'];
					var class_string;
					classes.push(d.organization.toLowerCase().replace(/ /g, '-'));
					classes.push(d.race);
					classes.push(d.gender);
					class_string = classes.join(' ');
					return class_string;
				});
			spotlight
				.attr('transform', 'translate(' + spotlight_position.x + ',' + spotlight_position.y + ')');
			spotlight_rect
				.attr('width', spotlight_text_position.width + grid)
				.attr('height', spotlight_text_position.height + grid);
			spotlight_rect
				.attr('transform', 'translate(' + (-1 * grid / 2) + ',0)');
			// slight eye candy to gradually fade in the spotlight upon mouseover
			spotlight
				.attr('opacity', 0)
				.transition()
					.delay(duration / 4)
					.duration(duration / 4)
						.attr('opacity', 1);
		});
		person.on('mouseout', function remove_spotlight() {
			d3.selectAll('g#spotlight').remove();
		});
	}
	// wrapper function around all components of timeline view
	dvmx.timeline = function timeline(error) {
		if (error) {
			return new Error('could not render timeline');
		}
		dvmx.legend.timeline();
		if (!click_init) {
			target = person_rect;
		} else {
			target = person_rect.transition(duration).delay(dvmx.stagger);
		}
		target
			.attr('x', function(d, i) {
				var x_position = dvmx.scales.timeline_x(d.organization);			
				return x_position;
			})
			.attr('y', function(d, i) {
				var start = dvmx.helpers.parse_date(d.start);
				return dvmx.scales.timeline_y(start);
			})
			.attr('transform', '');
		dvmx.redraw_blocks(error);
	}
	// wrapper function around all components of grouped view.
	// input argument must be an array consisting of exactly
	// two groups which must be contained in the same property name,
	// which will be deduced as necessary
	dvmx.groups = function group_chart(groups) {
		if (error) {
			return new Error('could not render grouped chart');
		}
		var property,
			value;
		var column_height = {};
		var column_count = {};
		dvmx.legend.groups(groups);
		for (var i = 0; i < groups.length; i++) {
			value = groups[i];
			column_height[value] = 0;
			column_count[value] = 0;
		}
		var person_key;
		// extract property name from current view mode
		var property = mode.replace('groups-', '');
		// re-sort to make sure we're stacking in chronological order
		// for each group
		person.sort(function(a, b) {
			var a_start = dvmx.helpers.parse_date(a.start);
			var b_start = dvmx.helpers.parse_date(b.start);
			if (a.last_name === 'Baquet') {return 1;}
			else if (b.last_name === 'Baquet') {return -1}
			else {return a_start - b_start;}
		});
		// re-select block after sorting so the blocks will flow into position
		// in the desired sequential order
		person_rect = person.select('rect');
		if (property) {
			person_rect
				.transition(duration)
					.delay(dvmx.stagger)
						.attr('transform', 'translate(0,0)')
						.attr('x', function(d, i) {
							var person_key = dvmx.helpers.get_person_key(d);
							var value = d[property];
							var grouping = groups.indexOf(value);
							var increment_direction;
							// toggle position based on group
							if (grouping === 1) {
								increment_direction = -1;
							} else {
								increment_direction = 1;
							}
							var x_position = (width * grouping) + (organization_width * increment_direction * grouping);
							return x_position;
						})
						.attr('y', 0)
						// all positioning really happens through the transforms
						.attr('transform', function(d, i) {
							var rect_height = parseFloat(d3.select(this).attr('height'));
							var transform_x = 0;
							var transform_y = 0;
							var value = d[property];
							var grouping = groups.indexOf(value);
							var increment_direction;
							if (grouping === 1) {
								increment_direction = -1;
							} else {
								increment_direction = 1;
							}
							var column_test = column_height[value] + rect_height;
							if(column_test > height) {
								transform_y = 0;
								column_height[value] = 0;
								column_count[value]++;
							} else {
								transform_y = column_height[value];
							}
							if(column_count[value] !== 0) {								
								transform_x = column_count[value] * organization_width * increment_direction;
							}
							column_height[value] = column_height[value] + rect_height;
							transform_string = 'translate(' + transform_x + ',' + transform_y + ')';
							return transform_string;
						});
		}
		dvmx.redraw_blocks(error);
	}
	// detect demographics and use them in determining a 
	// delay value for animations; blocks from back during the
	// the long reign of terror of white males don't need to 
	// have delays because they won't need to move much
	dvmx.stagger = function stagger_blocks(d, i) {
		var is_male = d.gender !== 'male';
		var is_white = d.race !== 'race';
		if(is_male && is_white) {
			staggers += 1
		}
		// hard coding the mode with which to run this,
		// making it dynamic probably isn't worth the hassle
		if(mode === 'groups-gender') {
			divisor = staggers * 10;
		} else {
			divisor = i;
		}
		return duration / 100 * divisor;
	}
	// register mouse clicks to toggle between views
	dvmx.track_clicks = function track_clicks(error) {
		if (error) {
			return new Error('could not track clicks');
		}
		click_init = true;
		svg.on('click', function(event) {
			clicks++;
			staggers = 0;
			if (clicks === 1) {
				mode = 'groups-race';
				dvmx.groups(['white', 'non-white']);
			} else if (clicks === 2) {
				mode = 'groups-gender';
				dvmx.groups(['male', 'female']);
			} else if (clicks === 3) {
				mode = 'timeline';
				dvmx.timeline(error);
				clicks = 0;
			}
		});
	}
	// wrapper function to run everything
	dvmx.execute = function execute(error) {
		if (error) {
			return new Error('could not execute wrapper');
		}
		dvmx.add_styles(error);
		dvmx.setup(error);
		dvmx.fetch(error, dvmx.render);
	}

	// it's party time!
	dvmx.execute(error);

}).call(this);
