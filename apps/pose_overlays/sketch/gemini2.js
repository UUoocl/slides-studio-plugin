// p5js r1b2 websocket example

// SETTINGS/ VARIABLES START

var EPHEMERAL = true;
var EPHEMERAL_ALPHA = 10; // 0-255. lower = longer lasting persistence
var FPS = 20;
var SCENE_SCALE = 1;
var SCENE_WIDTH = 800;
var SCENE_HEIGHT = 450;

// CONTROLS
var inp1, inp2, inp3, inp4, inp5, inp6, inp7;
let FPSslider;
let ephemeralCheckBox;
let ephemeralAlphaSlider;

var PALETTES = [
  ["Dune", '#00000000', [
    '#ab252640', '#e4712040', '#f8b21c40', '#e5761f40', '#d8513b40', '#fcea7340', '#35131440',
    '#ab252640', '#e4712040', '#f8b21c40', '#e5761f40', '#d8513b40', '#fcea7340', '#35131440',
    '#ab252640', '#e4712040', '#f8b21c40', '#e5761f40', '#d8513b40', '#fcea7340', '#35131440',
    '#ab252640', '#e4712040', '#f8b21c40', '#e5761f40', '#d8513b40', '#fcea7340', '#35131440',
    '#ab252640', '#e4712040', '#f8b21c40'
  ]]
];

var JOINTS = [
  "LEFT_INDEX", "RIGHT_INDEX", "LEFT_ELBOW", "RIGHT_ELBOW", "LEFT_HIP", "LEFT_WRIST", "RIGHT_WRIST"
];

let PALETTE;
var PAINTLINES;
var DRIPS = [];

var no_detection = false;
var timer = 0;

var raw_data;
var cur_data;

// https://www.desmos.com/calculator/1930qsv4kw
function parabolaInterpolator(y0, y1, y2)
{
  var a = (y2 - 2 * y1 + y0) / 2;
  var b = (y1 - y0 - a);
  return (x) => a * x * x + b * x + y0;
}

function getJointPosition(jointnr)
{
  if (cur_data && cur_data[jointnr]) {
      let cur_x = cur_data[jointnr].x;
      let cur_y = cur_data[jointnr].y;
      no_detection = false;
    return [cur_x, cur_y];
  } else {
    no_detection = true;
    return [-1000,-1000];
  }
}

sketch = function(p) {

  function randomizeColor(c)
  {
    var c0 = p.color(c);
    var r = p.random(-30, 30);
    return p.color(p.red(c0) + r, p.green(c0) + r, p.blue(c0) + r, p.alpha(c0));
  }

  class Drip
  {
    constructor(color, x, y, dx, dy, weight)
    {
      this.color = color;
      this.x = x;
      this.y = y;
      this.dx = dx;
      this.dy = dy;
      this.weight = weight;
      this.k = 2.0;
      this.gravity = p.random(0.001, 0.005);
    }

    update()
    {
      var k = p.random(0.5, 1);
      this.dx *= 0.98;
      this.dy += this.gravity; // Gravity effect
      this.x += p.random(-2, 2) / SCENE_WIDTH + k * this.dx;
      this.y += p.random(-2, 2) / SCENE_HEIGHT + k * this.dy;
      
      p.fill(randomizeColor(this.color));
      p.noStroke();
      p.circle(this.x * SCENE_WIDTH, this.y * SCENE_HEIGHT, this.weight * this.k);
      
      this.k *= 0.97; // Gradually shrink
      return (this.k >= 0.2);
    }
  }

  class PaintLine
  {
    constructor(color, x, y)
    {
      this.color = color;
      this.x = x;
      this.y = y;
      this.x2 = x;
      this.y2 = y;
      this.weight = SCENE_SCALE;
      this.speed2 = 0;
    }

    directionChangedX(x) { return (this.x - x) * (this.x - this.x2) > 0; }
    directionChangedY(y) { return (this.y - y) * (this.y - this.y2) > 0; }

    move(x, y)
    {
      if (x < -100 || this.x < -100) {
          this.x = x; this.y = y; this.x2 = x; this.y2 = y;
          return;
      }

      var px = parabolaInterpolator(this.x2, this.x, x);
      var py = parabolaInterpolator(this.y2, this.y, y);

      var dx = x - this.x;
      var dy = y - this.y;
      var speed2 = dx * dx + dy * dy;

      // Splatter logic
      if (speed2 < 0.00000001)
      {
        var ndrops = p.random(0, 2);
        for (var i = 0; i < ndrops; ++i)
        {
          DRIPS.push(new Drip(this.color, x + p.random(-1, 1) / SCENE_WIDTH, y + p.random(-1, 1) / SCENE_HEIGHT, 0.0, p.random(0.01, 0.02), p.random(2, 6.0) * SCENE_SCALE));
        }
      }
      else if (speed2 > 400 / (SCENE_WIDTH * SCENE_WIDTH))
      {
        if (this.directionChangedX(x) || this.directionChangedY(y))
        {
          var ndrops = p.random(2, 10);
          for (var i = 0; i < ndrops; ++i)
          {
            var r = p.random(1.0, 2.0);
            DRIPS.push(new Drip(this.color, px(1.1 + 0.25 * r), py(1.1 + 0.25 * r), dx * p.random(0.1, 0.5), dy * p.random(0.1, 0.5), r * SCENE_SCALE * 3));
          }
        }
      }

      this.speed2 = speed2;

      var weight = (10 - 0.2 * 800 * (p.pow(speed2, 0.3)));
      if (weight < 1.5) weight = 1.5;
      weight *= p.random(0.5, 1.5);
      this.weight = 0.5 * this.weight + 0.5 * weight;
      p.strokeWeight(this.weight * SCENE_SCALE);
      p.stroke(randomizeColor(this.color));
      p.noFill();

      var prevx = this.x;
      var prevy = this.y;
      for (var i = 1; i <= 10; ++i)
      {
        var newx = px(1.0 + i * 0.1);
        var newy = py(1.0 + i * 0.1);
        p.line(prevx * SCENE_WIDTH, prevy * SCENE_HEIGHT, newx * SCENE_WIDTH, newy * SCENE_HEIGHT);
        prevx = newx; prevy = newy;
      }

      this.x2 = this.x;
      this.y2 = this.y;
      this.x = x;
      this.y = y;
    }
  }

  p.setup = function()
  {
    PALETTE = PALETTES[0];
    p.createCanvas(SCENE_WIDTH, SCENE_HEIGHT, p.P2D);
    p.clear();
    p.frameRate(FPS);

    window.newPaintLines = () => {
        PAINTLINES = [];
        var colors = PALETTE[2];
        for (var i = 0; i < colors.length; ++i)
        {
            var [x, y] = getJointPosition(i);
            PAINTLINES.push(new PaintLine(colors[i], x, y));
        }
    };

    window.newPaintLines();

    if(!hideCanvasUI){
        FPSslider = p.createSlider(1, 60, 20); FPSslider.position(25, 20); FPSslider.style('width', '100px');
        ephemeralCheckBox = p.createCheckbox('', true);ephemeralCheckBox.position(50, 72);
        ephemeralAlphaSlider = p.createSlider(0, 255, 10);ephemeralAlphaSlider.position(20,40);
        inp1 = p.createColorPicker('#ff0000');inp1.position(170, 70);inp1.style('width', '20px');
        inp2 = p.createColorPicker('#ffff00');inp2.position(170, 100);inp2.style('width', '20px');
        inp3 = p.createColorPicker('#0000ff');inp3.position(170, 130);inp3.style('width', '20px');
        inp4 = p.createColorPicker('#ffffff');inp4.position(170, 160);inp4.style('width', '20px');
        inp5 = p.createColorPicker('#000');inp5.position(170, 190);inp5.style('width', '20px');
        inp6 = p.createColorPicker('#000');inp6.position(170, 220);inp6.style('width', '20px');
        inp7 = p.createColorPicker('#000');inp7.position(170, 250);inp7.style('width', '20px');
    }
  }

  p.draw = function() {
    if (FPSslider) p.frameRate(FPSslider.value());
    EPHEMERAL = ephemeralCheckBox ? ephemeralCheckBox.checked() : true;
    EPHEMERAL_ALPHA = ephemeralAlphaSlider ? ephemeralAlphaSlider.value() : 10;

    if (inp1) {
        let currentColors = [inp1.value(), inp2.value(), inp3.value(), inp4.value(), inp5.value(), inp6.value(), inp7.value()];
        if (PAINTLINES) {
            for (let i = 0; i < PAINTLINES.length; i++) {
                PAINTLINES[i].color = currentColors[i % currentColors.length];
            }
        }
    }

    if (EPHEMERAL) {
      p.push();
      p.drawingContext.globalCompositeOperation = 'destination-out';
      p.fill(255, EPHEMERAL_ALPHA);
      p.rect(0, 0, SCENE_WIDTH, SCENE_HEIGHT);
      p.pop();
    } else {
      p.clear();
    }

    if (PAINTLINES) {
        for (var i = 0; i < PAINTLINES.length; ++i)
        {
          let [x, y] = getJointPosition(i);
          if (no_detection) {
            no_detection = false;
            continue;
          }
          PAINTLINES[i].move(x, y);
        }
    }

    // Update and draw drips
    var j = 0;
    while (j < DRIPS.length)
    {
      if (DRIPS[j].update()) j++;
      else DRIPS.splice(j, 1);
    }
  }
}

stage = new p5(sketch, 'p5_stage');
