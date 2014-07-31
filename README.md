Diversity Matrix
===============

## OVERVIEW ##

The **Diversity Matrix** is a simple reusable data visualization which plots demographic information for the individuals in a set of groups along interactive timelines.

See an example: <a href="http://community.scratchmag.net/diversity-in-journalism">Diversity in Journalism</a> at Scratch Magazine.

<img src="https://raw.github.com/vijithassar/diversitymatrix/master/header.png">

With each click, the blocks representing the people are sorted into different groups corresponding to each demographic quality, which illuminates the overall diversity of the groups represented.  By default, it is configured to sort by race and then by gender, but this is trivial to extend if you want to highlight other characteristics. Best of all, it has been designed to be easy to re-implement, even if you don't know any programming -- all you need is a spreadsheet, plus a tiny bit of HTML to get it up onto your web site.

## INSTRUCTIONS ##

To launch your own diversity matrix:

1) First make a spreadsheet which contains a list of the people you want in the chart. Each person will be rendered as a rectangle with a little popup box. The spreadsheet must have columns for "first name", "middle name", and "last name," as well as "start_date" and "end_date", and "organization" -- this last one is what will determine which column each person appears in. Dates can be four-digit years, and can also include the month for specificity if desired with the format MM/YYYY (e.g. "7/2014"). The "end_date" field can be set to "present" if applicable.

2) Export the spreadsheet as a comma-separated values file called people.csv -- it shouldn't be necessary, but just in case, this repository includes a sample which you can use as your template.

3) For non-techies, this is the trickiest part -- figure out where you're going to keep these files on your server, then open up the diversitymatrix.js script and edit the first couple lines to reflect those locations:

```javascript

  var data_url = 'http://www.whatever.com/path/to/the/data/file/people.csv';
  var stylesheet_url = 'http://www.whatever.com/path/to/the/stylesheet/diversitymatrix.css';

```

You can also set the end date of the chart. Note that the month starts counting from zero instead of one, so in this example the 7 refers to August, not July as you might expect:

```javascript
  var end_date = new Date(2014, 7);
```

You can also specify an exact day if you want:

```javascript
  var end_date = new Date(2014, 7, 15);
```

If you don't specify, the current date will be used — and the most recent boxes will grow over time to accommodate it.

* \* Food for thought, nerds: would switching to a module pattern and/or implementing Mike Bostock's <a href="http://bost.ocks.org/mike/chart/">suggestions for reusable charts</a> make this config step easier or harder for non-coders? Hmmm.\* *

4) Upload the diversitymatrix.css, people.csv, and diversitymatrix.js files to your server or web host; make sure the first two items end up in the exact locations you specified when you edited them into diversitymatrix.js.

5) Add the following HTML to your web page or blog post or whatever:

```html

  <div id="diversitymatrix"></div>
  <script type="text/javascript" charset="utf-8" src="http://d3js.org/d3.v3.min.js"></script>
  <script type="text/javascript" src="http://www.whatever.com/path/to/the/script/diversitymatrix.js"></script>

```

6) That's it! Please <a href="http://www.twitter.com/vijithassar">let me know</a> if you're using this, though; it's always rewarding to see a project in the wild.

--

## ADDING YOUR OWN DEMOGRAPHICS ##

If you have a little JavaScript knowledge, you can also even add your own new demographic qualities to use in the sorted displays -- just add them to your spreadsheet before exporting people.csv! A couple things to keep in mind if you're going down this road, though:

* Because the matrix automatically sorts into "left" and "right" it can only support binary sorting, which is to say, any new demographic quality you want to highlight must have exactly two possible values. In other words, "rich/poor" would work, but "rich/middle-class/poor" would not. The new fields you add must be present and defined for every person in your data set, because "unknown" or "undefined" would technically be a third value.

* Before you can actually see it, you'll need to add your new demographic to the track_clicks() method (it's somewhere near line 700 of diversitymatrix.js) -- just run the groups() method with whatever parameters you want for the specified number of clicks, and then reset it back to the timeline() method with one more click at the end of the loop.

* You might also find it worthwhile to tweak the stagger_blocks() method, which offsets animation speed to account for blocks that don't need to move at all when transitioning between one grouped demographic view and the next; for example, white males might not need to move when switching between race sorting and gender sorting. This bit was hard-coded to save me a lot of trouble, but if you've made it this far then it should be easy enough to add a quick test for your new grouped display.
