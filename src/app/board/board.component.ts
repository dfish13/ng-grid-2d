import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { fromEvent } from 'rxjs';


const toolTipOptions = [
  [[0, 0]],
  [[2,0],[2,1],[2,2],[1,2],[0,1]],
  [[0,0],[0,1],[0,2],[1,2],[1,1],[1,0],[2,0],[2,1],[2,2],[3,0],[3,1],[3,2],[3,3],[2,3],[1,3],[0,3]],
  [[0,4],[0,5],[1,5],[1,4],[10,4],[10,5],[10,6],[11,3],[11,7],[12,2],[12,8],[13,2],[13,8],[14,5],[15,3],[15,7],[16,6],[16,5],[16,4],[17,5],[20,4],[21,4],[20,3],[21,3],[20,2],[21,2],[22,1],[22,5],[24,5],[24,6],[24,0],[24,1],[34,2],[35,2],[35,3],[34,3]],
  [[2,3],[1,4],[2,2],[0,4],[2,0],[2,1],[2,4],[0,3],[1,0],[1,1],[1,2],[1,5],[3,1],[3,2],[3,3]]
]

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
  toolTip: { x: number, y: number };
  iTool: number;
  toolTipOffsets: number[][];
  
  ngOnInit(): void {
    this.initBoard();
  }

  initBoard(): void {
    this.ctx = this.canvas.nativeElement.getContext('2d');
    this.ctx.canvas.width = this.gridSize * this.tileSize;
    this.ctx.canvas.height = this.gridSize * this.tileSize;
    this.ctx.fillStyle = '#444';
    this.stepNum = 0;
    this.stepTime = 10;
    this.liveTiles = [];
    this.tiles = new Array(this.gridSize).fill(0).map(() => Array(this.gridSize).fill(0))
    this.highlightedTiles = []
    this.toolTip = {
      x: -1,
      y: -1
    }
    this.iTool = 0
    this.interval = new Interval(this.step.bind(this), this.stepTime)
    this.captureEvents(this.ctx.canvas)
  }

  cycleTooltip() {
    this.iTool = (this.iTool + 1) % toolTipOptions.length
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
      for (var o of toolTipOptions[this.iTool]) {
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
      this.clearHighlight()
      this.ctx.fillStyle = "#369"
      for (var o of toolTipOptions[this.iTool]) {
        const a = i - o[0]
        const b = j - o[1]
        if (a >= 0 && a < this.gridSize && b >= 0 && b < this.gridSize) {
          this.ctx.fillRect(a * this.tileSize, b * this.tileSize, this.tileSize, this.tileSize)
          this.highlightedTiles.push([a, b])
        }
      }
      this.ctx.fillStyle = "#444"
    })

    fromEvent(canvasEl, 'mouseleave').subscribe(() => {
      this.clearHighlight()
    })
  }

  draw() {
    this.ctx.clearRect(0, 0, this.gridSize * this.tileSize, this.gridSize * this.tileSize)
    for (var tile of this.liveTiles)
      tile.draw(this.ctx);
    this.ctx.fillStyle = "#369"
    for (var [i, j] of this.highlightedTiles)
      this.ctx.fillRect(i * this.tileSize, j * this.tileSize, this.tileSize, this.tileSize)
    this.ctx.fillStyle = "#444"
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

  logTiles() {
    let left = Number.MAX_SAFE_INTEGER
    let top = Number.MAX_SAFE_INTEGER
    for (var t of this.liveTiles)
    {
      left = Math.min(left, t.i)
      top = Math.min(top, t.j)
    }

    let tiles = []
    for (var t of this.liveTiles)
      tiles.push([t.i - left, t.j - top])
    console.log(JSON.stringify(tiles))
  }

  gun() {
    const GospersGun = [[0,4],[0,5],[1,5],[1,4],[10,4],[10,5],[10,6],[11,3],[11,7],[12,2],[12,8],[13,2],[13,8],[14,5],[15,3],[15,7],[16,6],[16,5],[16,4],[17,5],[20,4],[21,4],[20,3],[21,3],[20,2],[21,2],[22,1],[22,5],[24,5],[24,6],[24,0],[24,1],[34,2],[35,2],[35,3],[34,3]]
    const top = 1
    const left = 1
    for (var c of GospersGun) {
      if (this.tiles[left + c[0]][top + c[1]] == 0)
        this.liveTiles.push(new Tile(left + c[0], top + c[1], this.tileSize))
      this.tiles[left + c[0]][top + c[1]] = 1
    }
    this.draw()
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