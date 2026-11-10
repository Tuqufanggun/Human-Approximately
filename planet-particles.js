/* Shared renderer for the Voyager scene and the standalone study. */
function createPlanetParticleRenderer() {
  'use strict';

  const tau = Math.PI * 2;
  let seed = 8766;
  function random() {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  }

  function direction(longitude, latitude) {
    const lon = longitude * Math.PI / 180;
    const lat = latitude * Math.PI / 180;
    return [Math.cos(lat) * Math.sin(lon), Math.sin(lat), Math.cos(lat) * Math.cos(lon)];
  }

  // Stylized coastlines in longitude and latitude, including the Pacific-facing hemisphere.
  const continents = [
    [[-168,64],[-153,71],[-130,73],[-119,77],[-98,78],[-81,74],[-67,62],[-59,54],[-67,47],[-77,38],[-80,26],[-91,29],[-97,22],[-88,18],[-82,10],[-79,8],[-83,6],[-92,15],[-106,22],[-116,31],[-126,48],[-134,58],[-149,59]],
    [[-81,10],[-74,12],[-65,10],[-58,6],[-48,1],[-35,-6],[-39,-16],[-47,-24],[-54,-34],[-63,-44],[-67,-55],[-73,-51],[-75,-35],[-72,-20],[-77,-9],[-81,1]],
    [[-72,78],[-59,82],[-32,83],[-18,77],[-23,67],[-43,59],[-54,65],[-61,74]],
    [[-17,36],[-5,36],[9,37],[24,32],[33,31],[43,11],[51,11],[44,-3],[39,-12],[35,-23],[29,-32],[19,-35],[11,-29],[11,-17],[4,1],[-7,4],[-16,13],[-17,21]],
    [[-10,36],[-9,44],[-4,49],[7,53],[10,57],[8,63],[19,71],[38,69],[49,70],[64,75],[83,74],[99,77],[116,73],[133,72],[153,68],[175,64],[179,60],[164,57],[154,50],[141,48],[136,38],[124,39],[121,31],[110,21],[108,14],[104,5],[99,8],[95,19],[88,22],[84,17],[78,8],[73,18],[68,24],[60,25],[54,17],[47,14],[42,19],[39,29],[30,36],[22,40],[16,39],[10,44],[3,42],[-2,36]],
    [[112,-22],[116,-14],[127,-14],[136,-12],[143,-11],[149,-21],[154,-29],[151,-38],[142,-39],[133,-33],[121,-34],[114,-29]],
    [[95,5],[107,-4],[117,-7],[126,-5],[138,-3],[150,-5],[151,-9],[137,-9],[124,-10],[111,-9],[100,-5]],
    [[130,32],[135,35],[143,46],[146,44],[141,36],[136,33]],
    [[-10,50],[-6,59],[-2,58],[1,52],[-4,50]],
    [[44,-13],[50,-12],[49,-21],[44,-26],[43,-20]],
    [[166,-34],[177,-36],[179,-40],[170,-47],[166,-45],[174,-39]],
  ];

  function isLand(longitude, latitude) {
    if (latitude < -70 + 5 * Math.sin(longitude * .05)) return true;
    return continents.some(coast => {
      let inside = false;
      for (let i = 0, j = coast.length - 1; i < coast.length; j = i++) {
        const [x, y] = coast[i];
        const [px, py] = coast[j];
        if ((y > latitude) !== (py > latitude) &&
            longitude < (px - x) * (latitude - y) / (py - y) + x) inside = !inside;
      }
      return inside;
    });
  }

  function makeSurface(count, sampleTone) {
    const result = [];
    while (result.length < count) {
      const longitude = random() * 360 - 180;
      const latitude = Math.asin(random() * 2 - 1) * 180 / Math.PI;
      const [x, y, z] = direction(longitude, latitude);
      const tone = sampleTone(x, y, z, longitude, latitude);
      if (tone > 0) result.push({ x, y, z, tone });
    }
    return result;
  }

  const earth = makeSurface(20000, (_x, _y, _z, lon, lat) =>
    isLand(lon, lat) ? .55 + random() * .45 : 0);
  const oceans = makeSurface(14500, (_x, _y, _z, lon, lat) =>
    isLand(lon, lat) ? 0 : .45 + random() * .55);
  const oceanColors = ['#424137', '#615f50', '#7e7d6b', '#95947f', '#adac95'];
  const craters = [
    [-22,24,.23],[29,34,.29],[23,-22,.21],[-37,-24,.17],[-11,-48,.12],
    [51,2,.15],[-61,13,.10],[5,49,.09],[83,-16,.21],[-104,29,.24],
  ].map(([lon, lat, radius]) => ({ normal: direction(lon, lat), radius }));
  function craterTone(x, y, z) {
    let tone = .46 + random() * .51;
    for (const { normal: [nx, ny, nz], radius } of craters) {
      const distance = 2 - 2 * (x * nx + y * ny + z * nz);
      if (distance < radius ** 2 * .73) return random() < .035 ? .14 : 0;
      if (distance < radius ** 2 * 1.31) tone = 1;
    }
    return tone;
  }
  const mercury = makeSurface(4400, craterTone);
  const moon = makeSurface(8200, craterTone);
  const saturn = makeSurface(3600, (x, y, z) =>
    .36 + .19 * Math.sin(y * 25 + x * .25 + z * .3) + random() * .39);
  const ring = Array.from({ length: 5400 }, () => {
    const angle = random() * tau;
    const band = random();
    const radius = band < .28 ? 1.34 + random() * .24
      : band < .69 ? 1.68 + random() * .30 : 2.12 + random() * .22;
    return {
      x: Math.cos(angle) * radius,
      y: (random() - .5) * .035,
      z: Math.sin(angle) * radius,
      tone: .33 + random() * .65,
    };
  });
  const sun = makeSurface(2400, () => .61 + random() * .39);
  const rays = [];
  const rayPairs = 12;
  for (let index = 0; index < rayPairs; index++) {
    const angle = index * Math.PI / rayPairs;
    const length = [4.1, 2.7, 3.25][index % 3];
    for (let grain = 0; grain < 108; grain++) {
      const progress = random();
      const particle = {
        angle: angle + (random() - .5) * (.075 - progress * .033),
        distance: 1 + progress * (length - 1),
        drift: .025 + random() * .10,
        tone: (1 - progress * .75) * (.50 + random() * .50),
      };
      rays.push(particle, { ...particle, angle: particle.angle + Math.PI });
    }
  }

  const venus = makeSurface(4300, (x, y, _z, longitude) => {
    const cloud = Math.sin(y * 19 + Math.sin(longitude * Math.PI / 90) * 1.6 + x * 2);
    return cloud > .05 ? .64 + random() * .36 : .18 + random() * .18;
  });

  const mars = makeSurface(5200, (x, y, z) => {
    if (y > .77 || y < -.89) return .93 + random() * .07;
    const canyon = Math.abs(y + .16 - .13 * Math.sin(x * 4 + z * 2));
    if (canyon < .075 && x < .55 && x > -.82) return .13 + random() * .12;
    return .42 + random() * .49;
  });

  const jupiter = makeSurface(8500, (x, y, z) => {
    const storm = Math.hypot((x - .19) / .33, (y + .29) / .14);
    if (z > .45 && storm < 1.15) {
      return storm > .77 ? .96 : .26 + random() * .22;
    }
    const band = Math.sin(y * 31 + .8 * Math.sin(x * 4 + z * 3));
    return .48 + band * .27 + random() * .24;
  });

  const uranus = makeSurface(4400, (_x, y) => .47 + y * .12 + random() * .34);
  const uprightRing = Array.from({ length: 1300 }, () => {
    const angle = random() * tau;
    const radius = 1.30 + (random() > .62 ? .17 : 0) + random() * .06;
    return { x: Math.cos(angle) * radius, y: 0, z: Math.sin(angle) * radius, tone: .49 + random() * .48 };
  });

  const neptune = makeSurface(4700, (x, y, z) => {
    const storm = Math.hypot((x + .26) / .32, (y - .13) / .18);
    if (z > .45 && storm < 1) return .09 + random() * .12;
    const wind = Math.sin(y * 25 + Math.sin(x * 5 + z * 2) * 1.3);
    return .34 + (wind > .57 ? .36 : 0) + random() * .28;
  });

  const voyagerGold = '#b6a36a';
  const colors = ['#3d3724', '#544b31', '#706441', '#887950', '#a08f5d', voyagerGold];
  function paintCloud(ctx, body, centerX, centerY, radius, time) {
    const angle = body.turn + time * body.speed;
    const cos = Math.cos(angle), sin = Math.sin(angle);
    const tiltCos = Math.cos(body.tilt), tiltSin = Math.sin(body.tilt);
    const bins = colors.map(() => new Path2D());
    const pointSize = Math.max(body.minDot ?? .40, radius * .004);
    function addDot(x, y, tone, size) {
      const path = bins[Math.max(0, Math.min(colors.length - 1, Math.floor(tone * colors.length)))];
      path.moveTo(x + size, y);
      path.arc(x, y, size, 0, tau);
    }
    if (body.oceans) {
      const oceanBins = oceanColors.map(() => new Path2D());
      for (const point of body.oceans) {
        const z = point.z * cos - point.x * sin;
        if (z < 0) continue;
        const x = point.x * cos + point.z * sin;
        const y = point.y;
        const px = centerX + (x * tiltCos - y * tiltSin) * radius;
        const py = centerY - (x * tiltSin + y * tiltCos) * radius;
        const tone = point.tone * (.65 + z * .35);
        const path = oceanBins[Math.min(oceanColors.length - 1, Math.floor(tone * oceanColors.length))];
        const dot = pointSize * .86;
        path.moveTo(px + dot, py);
        path.arc(px, py, dot, 0, tau);
      }
      oceanBins.forEach((path, index) => {
        ctx.fillStyle = oceanColors[index];
        ctx.fill(path);
      });

      const outline = new Path2D();
      const count = Math.max(120, Math.round(tau * radius / 3.3));
      for (let index = 0; index < count; index++) {
        const angle = index * tau / count;
        const edge = radius * (1 + .0035 * Math.sin(index * 31.9));
        const px = centerX + Math.cos(angle) * edge;
        const py = centerY + Math.sin(angle) * edge;
        const dot = pointSize * (.44 + .24 * (.5 + .5 * Math.cos(index * 7.6)));
        outline.moveTo(px + dot, py);
        outline.arc(px, py, dot, 0, tau);
      }
      ctx.fillStyle = '#adac95';
      ctx.fill(outline);
    }
    for (const point of body.points) {

      const z = point.z * cos - point.x * sin;
      if (z < 0) continue;
      const x = point.x * cos + point.z * sin;
      const y = point.y;
      addDot(centerX + (x * tiltCos - y * tiltSin) * radius,
        centerY - (x * tiltSin + y * tiltCos) * radius,
        point.tone * (.63 + z * .37), pointSize);
    }
    for (const point of body.ring || []) {
      const x = point.x * cos + point.z * sin;
      const ringZ = point.z * cos - point.x * sin;
      const y = point.y + ringZ * (body.ringOpening ?? .35);
      if (ringZ < 0 && x * x + y * y < 1) continue;
      addDot(centerX + (x * tiltCos - y * tiltSin) * radius,
        centerY - (x * tiltSin + y * tiltCos) * radius, point.tone, .58);
    }
    for (const ray of body.rays || []) {
      const distance = ray.distance + Math.sin(time * 1.4 + ray.distance * 2.4) * ray.drift;
      addDot(centerX + Math.cos(ray.angle) * distance * radius,
        centerY + Math.sin(ray.angle) * distance * radius,
        ray.tone * (.86 + .14 * Math.cos(time * 2 + ray.angle * 2)), .48);
    }
    bins.forEach((path, index) => {
      ctx.fillStyle = colors[index];
      ctx.fill(path);
    });
  }

  const bodies = {
    earth: { points: earth, speed: .16, turn: .43, tilt: -.12, oceans },
    moon: { points: moon, speed: .10, turn: .10, tilt: -.18, minDot: .67 },
    mercury: { points: mercury, speed: .09, turn: .1, tilt: -.18, minDot: .57 },
    venus: { points: venus, speed: .15, turn: .3, tilt: -.44, minDot: .55 },
    mars: { points: mars, speed: .11, turn: .12, tilt: -.23, minDot: .55 },
    jupiter: { points: jupiter, speed: .10, turn: .1, tilt: -.06, minDot: .57 },
    saturn: { points: saturn, speed: .48, turn: 0, tilt: -.27, ring },
    sun: { points: sun, speed: .36, turn: 0, tilt: 0, rays },
    uranus: { points: uranus, speed: .15, turn: 0, tilt: 1.39, ring: uprightRing, ringOpening: .26 },
    neptune: { points: neptune, speed: .13, turn: -.12, tilt: -.22, minDot: .54 },
  };

  return {
    draw(ctx, name, x, y, radius, time) {
      paintCloud(ctx, bodies[name], x, y, radius, time);
    },
  };
}
