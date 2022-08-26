const app = new PIXI.Application(
    {
        width: 600,
        height: 100,
        backgroundColor: 0xffffff
    }
);

document.body.appendChild(app.view);

const circ = new PIXI.Graphics();
circ.beginFill(0xf4fe00)
.drawCircle(240, 50, 10);

app.stage.addChild(circ);

const candy = new PIXI.Graphics();
candy.beginFill(0x8ecd71)
.drawCircle(550, 50, 10)
.drawPolygon(530, 42, 530, 58, 548, 50)
.drawPolygon(570, 42, 570, 58, 552, 50);

app.stage.addChild(candy);

var r = Math.random();
var dir = -1;
if (r < 0.25) {
    dir = 0;
}
if (r >= 0.25 && r < 0.5) {
    dir = 1;
}
if (r >= 0.5 && r < 0.75) {
    dir = 2;
}
if (r >= 0.75) {
    dir = 3;
}
var dist = Math.random() * 200;
console.log(dist);
console.log(dir)
app.ticker.add(() =>
{
    if (circ.x < dist) {
        circ.x += 3;
    }
    if (circ.x >= dist) {
        if (dir == 0) {
            if (circ.x > 0) {
                circ.x -= 3;
            } else {
                circ.x += 3;
            }
        }
        if (dir == 1) {
            if (circ.y > -20) {
                circ.y -= 3;
            } else {
                if (circ.x > 200 && circ.y < 0) {
                    circ.y += 3;
                } else {
                    circ.x += 3;
                }
            }
        }
        if (dir == 2) {
            circ.x += 3;
        }
        if (dir == 3) {
            if (circ.y < 20) {
                circ.y += 3;
            } else {
                if (circ.x > 200 && circ.y > 0) {
                    circ.y -= 3;
                } else {
                    circ.x += 3;
                }
            }
        }  
    }
    if (circ.x > 310) {
        circ.x = 0;
        circ.y = 0;
    }
});

