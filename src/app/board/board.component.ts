import { Component, OnInit, ViewChild, ElementRef, HostListener } from '@angular/core';
import { MatSliderChange } from '@angular/material/slider';
import { MatRadioChange } from '@angular/material/radio';
import { fromEvent } from 'rxjs';

@Component({
  selector: 'game-board',
  templateUrl: './board.component.html',
  styleUrls: ['./board.component.scss']
})
export class BoardComponent implements OnInit {

  constructor() {}

  @ViewChild('canvas', {static: true}) canvas: ElementRef;
  ctx: CanvasRenderingContext2D;
  tileSize: number = 6;
  gridSize: number = 100;
  liveTiles: Tile[];
  tiles: number[][];
  stepNum: number;
  interval: Interval;
  stepTime: number;
  highlightedTiles: number[][];
  toolTip: ToolTip;
  toolTipOffsets: number[][];

  // From angular material default indigo-pink theme.
  primary: string = '#3F51B5';
  accent: string = '#FF4081';
  
  ngOnInit(): void {
    this.initBoard();
  }

  initBoard(): void {
    this.ctx = this.canvas.nativeElement.getContext('2d');
    this.ctx.canvas.width = this.gridSize * this.tileSize;
    this.ctx.canvas.height = this.gridSize * this.tileSize;
    this.ctx.fillStyle = this.primary;
    this.stepNum = 0;
    this.stepTime = 5;
    this.liveTiles = [];
    this.tiles = new Array(this.gridSize).fill(0).map(() => Array(this.gridSize).fill(0))
    this.highlightedTiles = []
    this.toolTip = new ToolTip()
    this.interval = new Interval(this.step.bind(this), this.stepTime)
    this.captureEvents(this.ctx.canvas)
  }

  
  @HostListener('window:keydown', ['$event'])
  keyEvent(event: KeyboardEvent) {
    const funcs = {
      'a': this.toolTip.reflect.bind(this.toolTip),
      'w': this.toolTip.next.bind(this.toolTip),
      's': this.toolTip.prev.bind(this.toolTip),
      'd': this.toolTip.rotate.bind(this.toolTip)
    }
    if (funcs[event.key]) {
      funcs[event.key]()
      this.drawHighlight(this.toolTip.x, this.toolTip.y)
    }
  }

  clearHighlight() {
    if (this.highlightedTiles.length == 0)
      return
    for (var t of this.highlightedTiles)
      if (this.tiles[t[0]][t[1]])
        this.ctx.fillRect(t[0] * this.tileSize, t[1] * this.tileSize, this.tileSize, this.tileSize)
      else
        this.ctx.clearRect(t[0] * this.tileSize, t[1] * this.tileSize, this.tileSize, this.tileSize)
    this.highlightedTiles = []
  }

  drawHighlight(i: number, j: number) {
    this.clearHighlight()
    this.ctx.fillStyle = this.accent
    for (var o of this.toolTip.getArr()) {
      const a = i - o[0]
      const b = j - o[1]
      if (a >= 0 && a < this.gridSize && b >= 0 && b < this.gridSize) {
        this.ctx.fillRect(a * this.tileSize, b * this.tileSize, this.tileSize, this.tileSize)
        this.highlightedTiles.push([a, b])
      }
    }
    this.ctx.fillStyle = this.primary
  }

  canvasCoords(e: MouseEvent) {
      const rect = this.ctx.canvas.getBoundingClientRect()
      const clamp = (num: number, min: number, max: number) => Math.max(min, Math.min(max, Math.floor(num)))
      const i = clamp((e.pageX - rect.x) / this.tileSize, 0, this.gridSize - 1)
      const j = clamp((e.pageY - rect.y) / this.tileSize, 0, this.gridSize - 1)
      return [i, j]
  }

  captureEvents(canvasEl: HTMLCanvasElement) {
    fromEvent(this.ctx.canvas, 'click').subscribe((e: MouseEvent) => {
      const [i, j] = this.canvasCoords(e)
      for (var o of this.toolTip.getArr()) {
        const a = i - o[0]
        const b = j - o[1]
        if (!(a >= 0 && a < this.gridSize && b >= 0 && b < this.gridSize))
          continue
        if (this.tiles[a][b] == 0) {
          this.liveTiles.push(new Tile(a, b, this.tileSize))
          this.tiles[a][b] = 1
        }
        else {
          this.tiles[a][b] = 0
          const k = this.liveTiles.findIndex((t: Tile) => t.i == a && t.j == b)
          this.liveTiles.splice(k, 1)
        }
      }
      this.draw()
    })
    
    fromEvent(canvasEl, 'mousemove').subscribe((e: MouseEvent) => {
      const [i, j] = this.canvasCoords(e)
      if (this.toolTip.x == i && this.toolTip.y == j)
        return
      this.toolTip.x = i;
      this.toolTip.y = j;
      this.drawHighlight(i, j)
    })

    fromEvent(canvasEl, 'mouseleave').subscribe(() => {
      this.clearHighlight()
      this.toolTip.x = -1;
      this.toolTip.y = -1;
    })
  }

  draw() {
    this.ctx.clearRect(0, 0, this.gridSize * this.tileSize, this.gridSize * this.tileSize)
    for (var tile of this.liveTiles)
      tile.draw(this.ctx);
    this.ctx.fillStyle = this.accent
    for (var [i, j] of this.highlightedTiles)
      this.ctx.fillRect(i * this.tileSize, j * this.tileSize, this.tileSize, this.tileSize)
    this.ctx.fillStyle = this.primary
  }
  
  evolve() {
    const offsets = [
      [1, 1],
      [0, 1],
      [-1, 1],
      [1, -1],
      [0, -1],
      [-1, -1],
      [1, 0],
      [-1, 0],
    ]
    let neighborCounts = new Array(this.gridSize).fill(0).map(() => Array(this.gridSize).fill(0))
    for (var i = 0; i < this.gridSize; i++)
      for (var j = 0; j < this.gridSize; j++)
        neighborCounts[i][j] = 0
    
    for (var tile of this.liveTiles)
      for (var o of offsets)
      {
        const a = tile.i + o[0]
        const b = tile.j + o[1]
        if ((a >= 0) && (a < this.gridSize) && (b >= 0) && (b < this.gridSize))
          neighborCounts[a][b]++
      }
    let nextLiveTiles: Tile[] = []
    for (var tile of this.liveTiles)
    {
      const nCount = neighborCounts[tile.i][tile.j]
      if (nCount == 2 || nCount == 3)
      {
        nextLiveTiles.push(tile)
        this.tiles[tile.i][tile.j] = 1
      }
      else
        this.tiles[tile.i][tile.j] = 0
      neighborCounts[tile.i][tile.j] = 0
    }

    for (var i = 0; i < this.gridSize; i++)
      for (var j = 0; j < this.gridSize; j++)
        if (neighborCounts[i][j] == 3)
        {
          nextLiveTiles.push(new Tile(i, j, this.tileSize))
          this.tiles[i][j] = 1;
        }
          
    this.liveTiles = nextLiveTiles
  }

  step() {
    this.evolve()
    this.draw()
    this.stepNum++
  }

  reset() {
    this.ctx.clearRect(0, 0, this.gridSize * this.tileSize, this.gridSize * this.tileSize)
    this.liveTiles.splice(0, this.liveTiles.length)
    this.tiles = new Array(this.gridSize).fill(0).map(() => Array(this.gridSize).fill(0))
    this.stepNum = 0
    this.interval.stop()
  }

  toggle() {
    if (this.interval.isRunning())
      this.interval.stop()
    else
      this.interval.start()
  }

  saveTooltip() {
    let left = Number.MAX_SAFE_INTEGER
    let top = Number.MAX_SAFE_INTEGER
    let right = Number.MIN_SAFE_INTEGER
    let bottom = Number.MIN_SAFE_INTEGER
    for (var t of this.liveTiles)
    {
      left = Math.min(left, t.i)
      top = Math.min(top, t.j)
      right = Math.max(right, t.i)
      bottom = Math.max(bottom, t.j)
    }

    let tiles = []
    for (var t of this.liveTiles)
      tiles.push([t.i - left, t.j - top])
    this.toolTip.add({
      d: [right - left + 1, bottom - top + 1],
      arr: tiles
    })
  }

  deleteTooltip() {
    this.toolTip.delete();
  }

  formatLabel(value: number) {
    return `${value}/s`;
  }

  onSliderValueChange(e: MatSliderChange) {
    this.interval.updateMilliseconds(Math.round(1000 / e.value))
  }

  onGridSizeChange(e: MatRadioChange) {
    if (this.interval.isRunning) {
      this.interval.stop()
    }
    const v = Number(e.value);
    this.gridSize = v;
    this.tileSize = Math.round(600 / v);
    this.reset();
  }



}

interface ToolTipOption {
  d: number[],
  arr: number[][]
};

class ToolTip {

  private static readonly defaultOptions: ToolTipOption[] = [
    {
      d: [1, 1],
      arr: [[0, 0]]
    },
    {
      d: [3, 3],
      arr: [[2,0],[2,1],[2,2],[1,2],[0,1]]
    },
    {
      d: [3, 8],
      arr: [[1,2],[1,5],[0,1],[0,6],[1,0],[1,3],[1,4],[1,7],[2,1],[2,6],[0,0],[0,2],[0,3],[0,4],[0,5],[0,7],[2,0],[2,2],[2,3],[2,4],[2,5],[2,7]]
    },
    {
      d: [36, 9],
      arr: [[0,4],[0,5],[1,5],[1,4],[10,4],[10,5],[10,6],[11,3],[11,7],[12,2],[12,8],[13,2],[13,8],[14,5],[15,3],[15,7],[16,6],[16,5],[16,4],[17,5],[20,4],[21,4],[20,3],[21,3],[20,2],[21,2],[22,1],[22,5],[24,5],[24,6],[24,0],[24,1],[34,2],[35,2],[35,3],[34,3]]
    },
    {
      d: [4, 6],
      arr: [[2,3],[1,4],[2,2],[0,4],[2,0],[2,1],[2,4],[0,3],[1,0],[1,1],[1,2],[1,5],[3,1],[3,2],[3,3]]
    }
  ]

  options: {d: number[], arr: number[][]}[];
  x: number;
  y: number;
  i: number;

  constructor() {
    this.init()
  }

  private init() {
    this.i = 0;
    this.x = -1;
    this.y = -1;
    this.options = []
    for (var o of ToolTip.defaultOptions)
      this.options.push(o)
  }

  next() {
    this.i = (this.i + 1) % this.options.length
  }

  prev() {
    this.i = (this.i + this.options.length - 1) % this.options.length
  }

  getArr() {
    return this.options[this.i].arr
  }

  rotate() {
    const [w, h] = this.options[this.i].d
    var newArr = []
    for (var o of this.options[this.i].arr)
      newArr.push([-o[1] + h, o[0]])
    this.options[this.i].arr = newArr
    this.options[this.i].d = [h, w]
  }

  reflect() {
    const [w, h] = this.options[this.i].d
    var newArr = []
    for (var o of this.options[this.i].arr)
      newArr.push([w - (o[0] + 1), o[1]])
    this.options[this.i].arr = newArr
  }

  add(option: ToolTipOption) {
    this.options.push(option);
  }

  delete() {
    this.options.splice(this.i, 1)
    this.i = this.i % this.options.length;
  }
}

class Interval {

  running: boolean;
  id: number;
  fn: Function;
  ms: number;
  
  constructor(fn: Function, ms: number) {
    this.fn = fn;
    this.ms = ms;
    this.running = false;
  }

  isRunning(): boolean { return this.running }
  
  start(): void {
    if (!this.running)
      this.id = setInterval(this.fn, this.ms)
    this.running = true
  }

  stop(): void {
    if (this.running)
      clearInterval(this.id)
    this.running = false
  }

  updateMilliseconds(ms: number) {
    this.ms = ms
    if (this.running) {
      clearInterval(this.id)
      this.id = setInterval(this.fn, this.ms)
    }
  }

}

class Tile {

  i: number;
  j: number;
  gridSize: number;
  tileSize: number;

  constructor(i: number, j: number, tileSize: number) {
    this.i = i;
    this.j = j;
    this.tileSize = tileSize;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.fillRect(this.i * this.tileSize, this.j * this.tileSize, this.tileSize, this.tileSize)
  }
}