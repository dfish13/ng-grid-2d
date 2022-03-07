import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { fromEvent } from 'rxjs';

@Component({
  selector: 'game-board',
  templateUrl: './board.component.html',
  styleUrls: ['./board.component.css']
})
export class BoardComponent implements OnInit {

  constructor() {}

  @ViewChild('canvas', {static: true}) canvas: ElementRef;
  ctx: CanvasRenderingContext2D;
  tileSize: number = 10;
  gridSize: number = 50;
  liveTiles: Tile[];
  tiles: number[][];
  stepNum: number;
  intervalId: ReturnType<typeof setInterval>;
  stepTime: number;
  highlightedTile: number[];
  
  ngOnInit(): void {
    this.initBoard();
  }

  initBoard(): void {
    this.ctx = this.canvas.nativeElement.getContext('2d');
    this.ctx.canvas.width = this.gridSize * this.tileSize;
    this.ctx.canvas.height = this.gridSize * this.tileSize;
    this.ctx.fillStyle = '#444';
    this.stepNum = 0;
    this.stepTime = 250;
    this.liveTiles = [];
    this.tiles = new Array(this.gridSize).fill(0).map(() => Array(this.gridSize).fill(0))
    this.highlightedTile = []
    this.captureEvents(this.ctx.canvas)
  }

  clearHighlight() {
    if (this.highlightedTile.length == 0)
      return
    const h = this.highlightedTile
    if (this.tiles[h[0]][h[1]])
      this.ctx.fillRect(h[0] * this.tileSize, h[1] * this.tileSize, this.tileSize, this.tileSize)
    else
      this.ctx.clearRect(h[0] * this.tileSize, h[1] * this.tileSize, this.tileSize, this.tileSize)
    this.highlightedTile = []
  }

  captureEvents(canvasEl: HTMLCanvasElement) {
    fromEvent(this.ctx.canvas, 'click').subscribe((e: MouseEvent) => {
      const rect = this.ctx.canvas.getBoundingClientRect()
      const i = Math.max(0, Math.floor((e.pageX - rect.x) / this.tileSize + 0.5) - 1)
      const j = Math.max(0, Math.floor((e.pageY - rect.y) / this.tileSize + 0.5) - 1)
      if (this.tiles[i][j] == 0)
      {
        this.liveTiles.push(new Tile(i, j, this.tileSize, this.tileSize))
        this.tiles[i][j] = 1
      }
      this.draw()
    })
    
    fromEvent(canvasEl, 'mousemove').subscribe((e: MouseEvent) => {
      const h = this.highlightedTile
      const rect = this.ctx.canvas.getBoundingClientRect()
      const i = Math.max(0, Math.floor((e.pageX - rect.x) / this.tileSize + 0.5) - 1)
      const j = Math.max(0, Math.floor((e.pageY - rect.y) / this.tileSize + 0.5) - 1)
      if (h.length && h[0] == i && h[1] == j)
        return
      this.clearHighlight()
      this.ctx.fillStyle = "#369"
      this.ctx.fillRect(i * this.tileSize, j * this.tileSize, this.tileSize, this.tileSize)
      this.highlightedTile = [i, j]
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
          nextLiveTiles.push(new Tile(i, j, this.tileSize, this.tileSize))
          this.tiles[i][j] = 1;
        }
          
    this.liveTiles = nextLiveTiles
  }

  step() {
    this.evolve()
    this.draw()
    this.stepNum++
  }

  play() {
    this.intervalId = setInterval(this.step.bind(this), this.stepTime)
  }

  reset() {
    this.ctx.clearRect(0, 0, this.gridSize * this.tileSize, this.gridSize * this.tileSize)
    this.liveTiles.splice(0, this.liveTiles.length)
    this.tiles = new Array(this.gridSize).fill(0).map(() => Array(this.gridSize).fill(0))
    this.stepNum = 0
    clearInterval(this.intervalId)
  }

  pause() {
    clearInterval(this.intervalId)
  }

}

class Tile {

  i: number;
  j: number;
  gridSize: number;
  tileSize: number;

  constructor(i: number, j: number, gridSize: number, tileSize: number) {
    this.i = i;
    this.j = j;
    this.gridSize = gridSize;
    this.tileSize = tileSize;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.fillRect(this.i * this.tileSize, this.j * this.tileSize, this.tileSize, this.tileSize)
  }
}