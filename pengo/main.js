const config = {
  type: Phaser.AUTO,
  width: 640,
  height: 480,
  backgroundColor: '#202020', // Darker background for better contrast with simple shapes
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: true // Keep this true for debugging!
    }
  },
  scene: {
    preload,
    create,
    update
  }
};

let player;
let cursors;
let pushableBlocks;
let staticBlocks;
const TILE_SIZE = 40;
const PLAYER_SPEED = 160;
const BLOCK_PUSH_SPEED = 250; // Make blocks slide a bit faster than player

// Simple function to create a colored square texture
function createSquareTexture(scene, key, color, size) {
  const graphics = scene.make.graphics({ x: 0, y: 0, add: false });
  graphics.fillStyle(color, 1);
  graphics.fillRect(0, 0, size, size);
  graphics.generateTexture(key, size, size);
  graphics.destroy();
}

function preload() {
  // Create simple textures instead of loading images for now
  createSquareTexture(this, 'playerSprite', 0x0077ff, TILE_SIZE * 0.9); // Blue player
  createSquareTexture(this, 'pushableBlockSprite', 0xcccccc, TILE_SIZE); // Light grey pushable block
  createSquareTexture(this, 'staticBlockSprite', 0x666666, TILE_SIZE);   // Dark grey static block

  console.log("Preload complete. Textures should be created.");
}

function create() {
  staticBlocks = this.physics.add.staticGroup();
  pushableBlocks = this.physics.add.group();

  const levelLayout = [
    'WWWWWWWWWWWWWWWW',
    'W              W',
    'W  B B B B B   W',
    'W              W',
    'W  B P B B B   W',
    'W              W',
    'W  B B B B B   W',
    'W              W',
    'W  B B B B B   W',
    'W              W',
    'WBBBBBBBBBBBBBBW',
    'WWWWWWWWWWWWWWWW',
  ];

  let playerStartX = 320;
  let playerStartY = 240;

  for (let y = 0; y < levelLayout.length; y++) {
    for (let x = 0; x < levelLayout[y].length; x++) {
      const char = levelLayout[y][x];
      const worldX = x * TILE_SIZE + TILE_SIZE / 2;
      const worldY = y * TILE_SIZE + TILE_SIZE / 2;

      if (char === 'W') {
        staticBlocks.create(worldX, worldY, 'staticBlockSprite').refreshBody();
      } else if (char === 'B') {
        const block = pushableBlocks.create(worldX, worldY, 'pushableBlockSprite');
        block.body.setSize(TILE_SIZE, TILE_SIZE);
        block.body.immovable = true; // Start as immovable
        // block.body.setCollideWorldBounds(true); // Optional: if blocks can be pushed out
      } else if (char === 'P') {
        playerStartX = worldX;
        playerStartY = worldY;
      }
    }
  }

  player = this.physics.add.sprite(playerStartX, playerStartY, 'playerSprite');
  player.body.setSize(TILE_SIZE * 0.8, TILE_SIZE * 0.8, true); // Center body
  player.setCollideWorldBounds(true);

  cursors = this.input.keyboard.createCursorKeys();

  // --- Collisions ---
  this.physics.add.collider(player, staticBlocks);
  this.physics.add.collider(player, pushableBlocks, handlePlayerBlockPush, null, this);
  this.physics.add.collider(pushableBlocks, staticBlocks, stopSlidingBlock, null, this);
  this.physics.add.collider(pushableBlocks, pushableBlocks, stopSlidingBlock, null, this);

  console.log("Create complete. Player and blocks should be visible.");
}

function update() {
  player.setVelocity(0);

  if (cursors.left.isDown) player.setVelocityX(-PLAYER_SPEED);
  else if (cursors.right.isDown) player.setVelocityX(PLAYER_SPEED);

  if (cursors.up.isDown) player.setVelocityY(-PLAYER_SPEED);
  else if (cursors.down.isDown) player.setVelocityY(PLAYER_SPEED);

  // Reset 'blocked' status for player for the next frame's input processing.
  // The physics engine updates these, but we read them in the collider.
  // This line might not be strictly necessary as `blocked` is reset by physics engine each step.
  // player.body.blocked.none = false; // (This is actually not how to reset it, physics does it)
}

function handlePlayerBlockPush(player, block) {
  // console.log(`Player at (${player.x.toFixed(0)}, ${player.y.toFixed(0)}), Block at (${block.x.toFixed(0)}, ${block.y.toFixed(0)})`);
  // console.log(`Block velocity: (${block.body.velocity.x}, ${block.body.velocity.y}), Immovable: ${block.body.immovable}`);
  // console.log(`Player blocked: U:${player.body.blocked.up} D:${player.body.blocked.down} L:${player.body.blocked.left} R:${player.body.blocked.right}`);

  const PUSH_THRESHOLD = 2; // Minimum velocity to consider it a push attempt by player.
                            // This helps avoid pushes from tiny residual movements.

  // If the block is already sliding, player just collides.
  // The block should remain !immovable.
  if (block.body.velocity.x !== 0 || block.body.velocity.y !== 0) {
    block.body.immovable = false; // Ensure it stays movable
    // console.log("Block is already sliding.");
    return;
  }
  // At this point, block is stationary. Make it solid by default for this interaction,
  // unless a push condition is met.
  block.body.immovable = true;

  let pushed = false;

  // Check which side the player is blocked on by THIS block.
  // And if the player is actively trying to move in that direction.
  if (player.body.blocked.right && cursors.right.isDown && Math.abs(player.body.velocity.x) > PUSH_THRESHOLD) {
    // console.log("Attempting PUSH RIGHT");
    block.body.immovable = false;
    block.setVelocity(BLOCK_PUSH_SPEED, 0);
    pushed = true;
  } else if (player.body.blocked.left && cursors.left.isDown && Math.abs(player.body.velocity.x) > PUSH_THRESHOLD) {
    // console.log("Attempting PUSH LEFT");
    block.body.immovable = false;
    block.setVelocity(-BLOCK_PUSH_SPEED, 0);
    pushed = true;
  } else if (player.body.blocked.down && cursors.down.isDown && Math.abs(player.body.velocity.y) > PUSH_THRESHOLD) {
    // console.log("Attempting PUSH DOWN");
    block.body.immovable = false;
    block.setVelocity(0, BLOCK_PUSH_SPEED);
    pushed = true;
  } else if (player.body.blocked.up && cursors.up.isDown && Math.abs(player.body.velocity.y) > PUSH_THRESHOLD) {
    // console.log("Attempting PUSH UP");
    block.body.immovable = false;
    block.setVelocity(0, -BLOCK_PUSH_SPEED);
    pushed = true;
  }

  if (pushed) {
    // console.log(`Block PUSHED. New vel=(${block.body.velocity.x}, ${block.body.velocity.y}), immovable=${block.body.immovable}`);
    // To prevent player from "sticking" or passing through, ensure player is stopped *by the physics interaction itself*.
    // Sometimes, a tiny offset helps the physics engine resolve collisions better after a state change.
    // Example: player.x -= Math.sign(block.body.velocity.x) * 1; (use with caution)
  } else {
    // console.log("No valid push. Block remains solid.");
    block.body.immovable = true; // Explicitly ensure it's solid if not pushed
  }
}

function stopSlidingBlock(slidingBlock, otherObject) {
  // console.log(`StopSlidingBlock: Block at (${slidingBlock.x.toFixed(0)}, ${slidingBlock.y.toFixed(0)}) hit something.`);
  slidingBlock.setVelocity(0, 0);
  slidingBlock.body.immovable = true;

  if (otherObject.body && pushableBlocks.contains(otherObject)) {
    // console.log("It hit another pushable block. Stopping that too if it was stationary.");
    if (otherObject.body.velocity.x === 0 && otherObject.body.velocity.y === 0) {
         otherObject.body.immovable = true;
    }
    // If the otherObject was also sliding, its own collision will handle it,
    // or this collision might stop both.
  }

  // Align to grid (Optional, but good for Pengo feel. Can be tricky)
  // This is a basic snap, might need refinement if blocks get stuck.
  const snapThreshold = TILE_SIZE / 4;
  if (Math.abs(slidingBlock.body.prev.x - slidingBlock.x) > snapThreshold || Math.abs(slidingBlock.body.prev.y - slidingBlock.y) > snapThreshold) {
      // Only snap if it moved a significant amount, to avoid jitter when pushing against wall
      // This snapping logic needs to be more robust for perfect grid alignment.
      // For now, it's better to rely on physics separation.
      // slidingBlock.x = Math.round(slidingBlock.x / TILE_SIZE) * TILE_SIZE + TILE_SIZE / 2;
      // slidingBlock.y = Math.round(slidingBlock.y / TILE_SIZE) * TILE_SIZE + TILE_SIZE / 2;
      // slidingBlock.body.reset(slidingBlock.x, slidingBlock.y);
  }
}

new Phaser.Game(config);