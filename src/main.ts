import "./style.css";

// Add specific Phaser imports for clarity and type checking
import Phaser, { Scenes, Types } from 'phaser';
// import { experimentalPhysics } from './physics'; // Remove incorrect import
import { announcementTemplates } from './announcements'; // Import the templates

// Define the structure for pie data
interface Pie {
  name: string;
  radius: number;
  assetKey: string;
  // Remove shape property
  // shape: 'circle' | 'rectangle'; 
  // Add 'vertices?: MatterJS.Vector[]' later if needed for polygons
}

// Define physics configuration type
type PhysicsConfig = {
  friction: number;
  bounce: number;
  density?: number; // Optional properties for future use
  frictionAir?: number;
  frictionStatic?: number;
  slop?: number;
};

// Define default physics settings
const defaultPhysics: PhysicsConfig = {
  friction: 0.005,
  bounce: 0.2,
  // Add other defaults here if needed later, e.g.:
  // density: 0.001,
  // frictionAir: 0.01,
  // frictionStatic: 0.1,
  // slop: 0.05,
};

// Example experimental config
const experimentalPhysics: PhysicsConfig = {
  friction: 0.05,       // Increased friction (less slippery)
  bounce: 0.1,          // Reduced bounce
  frictionStatic: 0.2,  // Added static friction (stickiness)
  // You can add density, frictionAir, slop here too
};

// Define pies in size order
const pies: Pie[] = [
  { name: "Lemon Tart", radius: 20, assetKey: "lemon_tart" },         // Smallest
  { name: "Apple Cross", radius: 28, assetKey: "apple_cross" },      // Rescaled
  { name: "Apple Square", radius: 35, assetKey: "apple_square" },   // Replaced Apple Crumble
  { name: "Blueberry Pie", radius: 43, assetKey: "blueberry" },       // Rescaled
  { name: "Cherry Pie", radius: 50, assetKey: "cherry_cross" },     // Renamed
  { name: "Chocolate Cream Pie", radius: 58, assetKey: "chocolate_cream" },// Rescaled
  { name: "Custard Pie", radius: 65, assetKey: "custard" },           // Renamed
  { name: "Key Lime Pie", radius: 73, assetKey: "key_lime" },         // Rescaled
  { name: "Lemon Meringue Pie", radius: 80, assetKey: "lemon_meringue" }, // Rescaled
  { name: "Oreo Pie", radius: 88, assetKey: "oreo" },               // Rescaled
  { name: "Pecan Pie", radius: 95, assetKey: "pecan" },              // Rescaled
  { name: "Pumpkin Pie", radius: 103, assetKey: "pumpkin" },         // Rescaled
  { name: "Raspberry Pie", radius: 110, assetKey: "raspberry" },       // Rescaled
  { name: "Strawberry Rhubarb Pie", radius: 118, assetKey: "shoofly" },         // Rescaled
  { name: "Tomato Pie", radius: 125, assetKey: "tomato" },          // Rescaled
  { name: "Tollhouse Cookie Pie", radius: 133, assetKey: "tollhouse" },       // Rescaled
  { name: "Chicken Pot Pie", radius: 140, assetKey: "chicken" },    // Rescaled
  { name: "Pizza Pie", radius: 148, assetKey: "pizza_pie" },      // Largest
];

class Main extends Phaser.Scene {
  score = 0;
  dropper!: Phaser.GameObjects.Image;
  group!: Phaser.GameObjects.Group;
  // ceiling!: Types.Physics.Matter.MatterBody; // Commented out old ceiling body
  gameOver = false;
  scoreText!: Phaser.GameObjects.Text;
  isDropping = false; // Flag to prevent dropping during animation
  announcedPieIndices: Set<number> = new Set(); // Track announced indices
  isAnnouncing = false; // Flag to prevent announcement overlap
  availableTemplates: string[] = []; // Pool of templates for variety
  flashPool!: Phaser.GameObjects.Group; // Add pool for flash effects
  // Remove old game over elements
  // gameOverLine!: Phaser.GameObjects.Rectangle;
  // timeOverLine = 0;
  // Keep UI elements, triggered differently later
  gameOverText!: Phaser.GameObjects.Text; 
  playAgainButtonContainer!: Phaser.GameObjects.Container;
  finalScoreText!: Phaser.GameObjects.Text; 
  muteButtonContainer!: Phaser.GameObjects.Container;
  restartButtonContainer!: Phaser.GameObjects.Container; // Restart button
  droppablePieIndices: number[] = [0, 1, 2, 3, 4, 5, 6, 7]; // Start with pies up to Key Lime (index 7)
  wallOffset = 0; // Class property for wall offset
  ceilingBody!: MatterJS.BodyType; // Add ceiling physics body property

  // --- Remove Update-based Check Properties --- 
  // highestPieY: number = 10000; 
  // timeAboveCeiling: number = 0; 
  // updateCheckInterval: number = 250; 
  // timeSinceLastUpdateCheck: number = 0;
  boundsGraphics!: Phaser.GameObjects.Graphics; // Make boundsGraphics a class property
  // --- End Removed Properties --- 

  // --- Properties for Sensor Count --- 
  ceilingSensorBody!: MatterJS.BodyType;
  piesTouchingCeilingThisFrame: Set<number> = new Set();
  // ceilingTouchCounterText!: Phaser.GameObjects.Text; // REMOVE Counter Text Property
  // --- End Sensor Count Properties --- 

  // --- Properties for Gauge --- 
  gaugeColors: number[] = []; // RE-ADD Array for segment colors
  ceilingGaugeSegments: Phaser.GameObjects.Graphics[] = []; // Use separate Graphics objects
  // --- End Gauge Properties --- 

  preload() {
    // Remove image loading for buttons
    // this.load.image("newgame", "/New Game Button.png"); 
    // this.load.image("playagain", "/New Game Button.png");

    // Load the combined pie texture atlas
    this.load.atlas('pie_atlas', '/pie_atlas.png', '/pie_atlas.json'); // Load directly from public root

    // Remove static background image load - will be handled by CSS
    // this.load.image('background', '/counter_bg.png');

    // Load sounds
    this.load.audio('squish', ['/sounds/squish1.ogg', '/sounds/squish1.aac']);
    this.load.audio('merge', ['/sounds/merge1.ogg', '/sounds/merge1.aac']); // Add merge sound
    this.load.audio('wompwomp', ['/sounds/wompwomp.ogg', '/sounds/wompwomp.aac']); // Add game over sound

    // Remove initial dropper update from preload
    // this.updatePieDropper(pies[Phaser.Math.RND.pick(this.droppablePieIndices)]); 
  }

  // Update function signature to use Pie type
  updatePieDropper(pie: Pie) {
    this.isDropping = true; // Prevent clicks during entry animation

    const ceilingY = 150; // Get the new ceiling position
    const targetY = ceilingY - pie.radius - 10; // REVERTED Resting Y: radius + buffer ABOVE ceiling
    const centerX = +this.game.config.width / 2;
    const startY = -pie.radius; // Start off-screen top (This is usually fine)
    // const startY = ceilingY - 50 - pie.radius; // Alternative: Start relative to ceiling

    this.dropper
      .setTexture('pie_atlas', pie.assetKey) // Use atlas key and frame name
      .setName(pie.name) // Use pie name
      .setDisplaySize(pie.radius * 2, pie.radius * 2)
      // Position off-screen initially
      .setY(startY) 
      .setX(centerX)
      .setVisible(true);
    
    // Tween dropper down into waiting position
    this.tweens.add({
        targets: this.dropper,
        y: targetY,
        duration: 200,
        ease: 'Cubic.Out',
        onComplete: () => {
            this.isDropping = false; // Allow clicks now that dropper is ready
        }
    });

    // Explicitly type gameObject in forEach loop
    this.group.getChildren().forEach((gameObject: Phaser.GameObjects.GameObject) => {
      if (gameObject instanceof Phaser.GameObjects.Image) {
        gameObject.postFX.clear();

        if (gameObject.name === pie.name) { // Match by name
          gameObject.postFX.addShine();
        }
      }
    });
  }

  // Update function signature to use Pie type
  addPie(x: number, y: number, pie: Pie): Phaser.Physics.Matter.Image {
    // Original version using setCircle
    const gameObject = this.matter.add
      .image(x, y, 'pie_atlas', pie.assetKey) // Use atlas key and frame name
      .setName(pie.name) // Use pie name
      .setDisplaySize(pie.radius * 2, pie.radius * 2)
      .setCircle(pie.radius) // Apply circular body
      // --- Use experimental physics --- 
      .setFriction(experimentalPhysics.friction)
      .setBounce(experimentalPhysics.bounce) // Note: Matter uses restitution
      .setFrictionStatic(experimentalPhysics.frictionStatic ?? 0) 
      // --- End experimental physics ---
      .setDepth(-1);
    
    return gameObject;
  }

  drawScore() {
    this.scoreText.setText(this.score.toString());
  }

  // Function to handle the merge animation
  animateMerge(pieA: Phaser.Physics.Matter.Image, pieB: Phaser.Physics.Matter.Image, nextPie: Pie, pieIndex: number) {
    // Disable physics temporarily to prevent interference during animation
    pieA.setStatic(true);
    pieB.setStatic(true);

    const mergeX = (pieA.x + pieB.x) / 2;
    const mergeY = (pieA.y + pieB.y) / 2;
    const shrinkDuration = 150; // Faster shrink/spin (was 250)
    const popDuration = 100; // Faster pop (was 150)
    const flashBaseDuration = 200; // Base duration for the flash effect
    const flashBaseScale = 5; // Base final scale for flash
    const largeMergeThreshold = 5; // Index threshold for bigger flash (Chocolate Cream merge -> Custard)
    const ringDelay = 50; // Delay between rings for large merges (ms)

    let completedTweens = 0;
    const totalTweens = 2;

    const onTweenComplete = () => {
      completedTweens++;
      if (completedTweens === totalTweens) {
        // --- Both tweens finished: Remove old, add new ---

        // --- Add Scaled Flash Effect ---
        const isLargeMerge = pieIndex >= largeMergeThreshold;
        const numberOfRings = isLargeMerge ? 3 : 1;
        const flashFinalScale = flashBaseScale * (isLargeMerge ? 1.5 : 1); // Larger scale for big merges
        const flashEffectDuration = flashBaseDuration * (isLargeMerge ? 1.2 : 1); // Slightly longer duration for big merges

        for (let i = 0; i < numberOfRings; i++) {
            // Get a flash object from the pool
            const flash = this.flashPool.get(mergeX, mergeY) as Phaser.GameObjects.Arc;
            if (!flash) continue; // Skip if pool is exhausted (shouldn't happen with maxSize)

            flash.setRadius(nextPie.radius * 0.5)
                 .setFillStyle(0xffffff, 0.8)
                 .setDepth(-0.5) // Behind the spawning pie but above others
                 .setScale(0) // Start invisible scale
                 .setActive(true)
                 .setVisible(true);
            
            this.tweens.add({
                targets: flash,
                scale: flashFinalScale, // Use calculated final scale
                alpha: 0, // Fade out
                duration: flashEffectDuration, // Use calculated duration
                delay: i * ringDelay, // Add delay for subsequent rings
                ease: 'Quad.Out', // Fast out easing
                onComplete: () => {
                    // Return the flash object to the pool instead of destroying it
                    this.flashPool.killAndHide(flash);
                }
            });
        }
        // --- End Flash Effect ---

        // Remove the two colliding pies from the group and destroy them
        this.group.remove(pieA, true, true);
        this.group.remove(pieB, true, true);

        // Add the new, larger pie
        const newGameObject = this.addPie(mergeX, mergeY, nextPie);
        const finalWidth = nextPie.radius * 2;
        const finalHeight = nextPie.radius * 2;

        // Set initial small size directly
        newGameObject.setDisplaySize(finalWidth * 0.1, finalHeight * 0.1);
        this.group.add(newGameObject); // Add the new pie to the group

        // Tween the new pie's dimensions to its final size (the "pop")
        this.tweens.add({
          targets: newGameObject,
          displayWidth: finalWidth,
          displayHeight: finalHeight,
          duration: popDuration, // Use faster pop duration
          ease: 'Back.Out' // Easing for a nice pop effect
        });

        this.score += (pieIndex + 1) * 10; // Update score (multiplied by 10)
        this.drawScore();

        // --- Check for unlocking and announce new pie ---
        const newPieIndex = pieIndex + 1;
        // Check if this pie type needs its announcement
        if (!this.announcedPieIndices.has(newPieIndex)) {
            this.announcedPieIndices.add(newPieIndex); // Add to set
            // console.log(`Announcing first appearance: ${nextPie.name}`);
            this.announceNewPie(nextPie, newPieIndex); // Announce ANY new pie type here
        }
        // Separately, check if it needs to be added to the droppable pool
        if (!this.droppablePieIndices.includes(newPieIndex)) {
            this.droppablePieIndices.push(newPieIndex);
            // console.log("Unlocked pie for dropping:", nextPie.name, " New droppable indices:", this.droppablePieIndices);
            // Announce LARGER pies (index > 2) immediately when created by merge
            /* // Logic moved above
            if (newPieIndex > 2 && !this.announcedPieIndices.has(newPieIndex)) {
                this.announcedPieIndices.add(newPieIndex); // Add to set
                // console.log(`Announcing large pie merge: ${nextPie.name}`);
                this.announceNewPie(nextPie, newPieIndex); 
            }
            */
        }
        // --- End unlock check ---

        // --- End new pie logic ---
      }
    };

    // Tween for Pie A
    this.tweens.add({
        targets: pieA,
        scale: 0,
        angle: pieA.angle + 360, // Spin
        x: mergeX, // Move towards center
        y: mergeY, // Move towards center
        duration: shrinkDuration, // Use faster shrink duration
        ease: 'Sine.InOut',
        onComplete: onTweenComplete
    });

    // Tween for Pie B
    this.tweens.add({
        targets: pieB,
        scale: 0,
        angle: pieB.angle - 360, // Spin opposite direction
        x: mergeX, // Move towards center
        y: mergeY, // Move towards center
        duration: shrinkDuration, // Use faster shrink duration
        ease: 'Sine.InOut',
        onComplete: onTweenComplete
    });
  }

  // Function to display announcement text for a newly discovered pie
  announceNewPie(pie: Pie, pieIndex: number) {
    // Prevent new announcement if one is already active
    if (this.isAnnouncing) {
        // console.log("Announcement skipped (already announcing)");
        return; 
    }
    this.isAnnouncing = true;

    // --- Select template and replace placeholder --- 
    // Refill and shuffle if pool is empty
    if (this.availableTemplates.length === 0) {
        // console.log("Refilling announcement templates");
        this.availableTemplates = [...announcementTemplates];
        Phaser.Utils.Array.Shuffle(this.availableTemplates);
    }
    // Pop a template from the shuffled pool
    const template = this.availableTemplates.pop() || "{PIE_NAME} UNLOCKED!"; // Fallback

    const announcementString = template.replace("{PIE_NAME}", pie.name.toUpperCase());
    // --- End template selection ---

    // Calculate Y position based on index
    const baseY = 200; // Base position below the game over line (160)
    const verticalStep = 10; // Small downward step for subsequent announcements
    const targetY = baseY + pieIndex * verticalStep; // Higher index = slightly lower on screen

    const announcementText = this.add.text(
        +this.game.config.width / 2,
        targetY, // Use calculated Y position
        announcementString, // Use the formatted string
        {
            fontFamily: 'sans-serif', // Use default sans-serif (thinner than Arial Black)
            fontSize: '40px', 
            color: '#ffffff',
            stroke: '#000000', // Changed stroke to black
            strokeThickness: 3, // Reduced stroke thickness
            align: 'center'
        }
    ).setOrigin(0.5).setAlpha(0).setScale(0.5).setDepth(10) // High depth
    .setShadow(2, 2, '#000000', 2, true, true); // Add drop shadow (offsetX, offsetY, color, blur, shadowStroke, shadowFill)

    // --- Word Wrapping --- 
    const playAreaWidth = +this.game.config.width - (this.wallOffset * 2); // Use class property
    const textPadding = 40; 
    const maxWidth = playAreaWidth - textPadding; 

    // Temporarily set full scale/alpha to measure, then revert
    announcementText.setScale(1).setAlpha(1);
    if (announcementText.width > maxWidth) {
        // console.log("Wrapping announcement text:", announcementString); // Comment out this log
        announcementText.setStyle({ wordWrap: { width: maxWidth, useAdvancedWrap: true } });
        // Re-center after wrapping might change bounds
        announcementText.setOrigin(0.5);
    }
    // Revert to initial state for animation
    announcementText.setScale(0.5).setAlpha(0);
    // --- End Word Wrapping ---

    // Entrance animation
    this.tweens.add({
        targets: announcementText,
        alpha: 1,
        scale: 1,
        duration: 300,
        ease: 'Power2',
        onComplete: () => {
            this.time.delayedCall(1000, () => {
                this.tweens.add({
                    targets: announcementText,
                    alpha: 0,
                    duration: 500,
                    ease: 'Power1',
                    onComplete: () => {
                        announcementText.destroy(); // Clean up
                        this.isAnnouncing = false; // Allow next announcement
                    }
                });
            });
        }
    });
  }

  create() {
    // Define wall offset early for use throughout create
    this.wallOffset = 65; // Initialize class property

    // --- Define NEW Playfield Boundaries --- 
    const ceilingY = 150; // NEW Higher ceiling position
    const floorY = 900;   // NEW Higher floor position
    // --- End NEW Boundaries ---

    // Remove sound priming - browser requires user gesture first
    // this.sound.play('squish', { volume: 0 });
    // this.sound.play('merge', { volume: 0 });

    // Initialize available announcement templates
    this.availableTemplates = [...announcementTemplates]; // Copy templates
    Phaser.Utils.Array.Shuffle(this.availableTemplates); // Shuffle initially

    // Remove static background image add - handled by CSS
    // this.add.image(0, 0, 'background').setOrigin(0, 0).setDepth(-3);

    // --- Remove Procedural Background Generation ---
    /*
    const rt = this.add.renderTexture(0, 0, +this.game.config.width, +this.game.config.height).setDepth(-3);
    const graphics = this.add.graphics();

    // Generate two random colors (HSL often looks better)
    const color1 = Phaser.Display.Color.HSVToRGB(Phaser.Math.RND.frac(), Phaser.Math.RND.realInRange(0.4, 0.7), Phaser.Math.RND.realInRange(0.5, 0.8));
    const color2 = Phaser.Display.Color.HSVToRGB(Phaser.Math.RND.frac(), Phaser.Math.RND.realInRange(0.4, 0.7), Phaser.Math.RND.realInRange(0.5, 0.8));
    
    // Draw a vertical gradient using the r, g, b properties (0-255)
    graphics.fillGradientStyle(
        color1.color, // Top Left (numeric color value)
        color1.color, // Top Right
        color2.color, // Bottom Left
        color2.color, // Bottom Right
        1 // Alpha
    );
    graphics.fillRect(0, 0, rt.width, rt.height);
    
    // Draw the graphics onto the RenderTexture
    rt.draw(graphics, 0, 0);

    // Optional: Add some faint shapes
    graphics.clear(); // Clear graphics for reuse
    for (let i = 0; i < 10; i++) { // Draw 10 faint circles
        const circleX = Phaser.Math.RND.between(0, rt.width);
        const circleY = Phaser.Math.RND.between(0, rt.height);
        const circleRadius = Phaser.Math.RND.between(50, 200);
        const circleColor = Phaser.Display.Color.RandomRGB(150, 255);
        graphics.fillStyle(circleColor.color, 0.1); // Use numeric color, low alpha
        graphics.fillCircle(circleX, circleY, circleRadius);
    }
    rt.draw(graphics, 0, 0); // Draw shapes onto the texture

    // Clean up the temporary graphics object
    graphics.destroy();
    */
    // --- End Procedural Background Generation ---

    // Remove gradient background drawing - handled by CSS now
    // const graphics = this.add.graphics();
    // graphics.fillGradientStyle(0x000033, 0x000033, 0x000066, 0x000066, 1); // Dark blue gradient
    // graphics.fillRect(0, 0, +this.game.config.width, +this.game.config.height);
    // graphics.setDepth(-3); // Ensure it's behind everything

    // Remove old particle emitter
    /*
    const particleAsset = this.textures.exists('neutron_star') ? 'neutron_star' : 'white_dwarf';
    const starEmitter = this.add.particles(0, 0, particleAsset, { 
        x: { min: 0, max: +this.game.config.width },
        y: { min: 0, max: +this.game.config.height },
        lifespan: { min: 3000, max: 6000 }, // Increase lifespan for slower effect
        speed: 0, // Stars don't move
        scale: { start: 0.05, end: 0.1, ease: 'Sine.easeInOut' }, // Increase size, smooth ease
        alpha: { start: 0.1, end: 0.7, ease: 'Sine.easeInOut', yoyo: true }, // Slower pulse effect
        blendMode: 'ADD',
        frequency: 200, // Decrease frequency slightly (fewer stars appearing at once)
        quantity: 1,
        tint: [0xffffff, 0xeeeeff, 0xddddff] // Slight blue/white tint variation
    });
    starEmitter.setDepth(-2); // Behind game elements but above gradient
    */

    // --- Remove fixed background pies ---

    // --- Add boundary lines for visualization ---
    this.boundsGraphics = this.add.graphics();
    this.boundsGraphics.lineStyle(1, 0xffffff, 1); // 1px, white, full alpha

    const rightWallX = +this.game.config.width - this.wallOffset; // Use class property

    // Left wall
    this.boundsGraphics.moveTo(this.wallOffset, ceilingY); // Start at ceiling
    this.boundsGraphics.lineTo(this.wallOffset, floorY); // Draw left wall

    // Floor
    this.boundsGraphics.moveTo(this.wallOffset, floorY);
    this.boundsGraphics.lineTo(rightWallX, floorY); // Draw floor

    // Right wall
    this.boundsGraphics.moveTo(rightWallX, ceilingY); // Start at ceiling
    this.boundsGraphics.lineTo(rightWallX, floorY); // Draw right wall
    
    // Ceiling Frame (Replace single line)
    this.boundsGraphics.strokeRect(this.wallOffset, ceilingY, rightWallX - this.wallOffset, 1); // Draw 1px high rect for ceiling frame

    this.boundsGraphics.strokePath(); // ADD THIS BACK - Draws the walls and floor
    this.boundsGraphics.setDepth(0); // Draw on top of particles/gradient, but potentially behind pies
    // --- End boundary lines ---

    // --- Add Ceiling Physics Body ---
    this.ceilingBody = this.matter.add.rectangle(
        +this.game.config.width / 2, // Center X
        ceilingY - 5, // Position slightly above the NEW visual line (150 - 5)
        +this.game.config.width - (this.wallOffset * 2), // Width between walls
        10, // Thickness
        { isStatic: true, label: 'ceiling' } // Make it static
    );
    // --- End Ceiling Physics Body ---

    // --- Add Ceiling SENSOR Body --- 
    const sensorY = ceilingY - 1; // Position slightly above the visual ceiling line
    this.ceilingSensorBody = this.matter.add.rectangle(
      +this.game.config.width / 2, // Center X
      sensorY, // Sensor position
      +this.game.config.width - (this.wallOffset * 2), // Width between walls
      5, // Small height/thickness
      { isStatic: true, isSensor: true, label: 'ceilingSensor' } // STATIC SENSOR
    );
    // --- End Ceiling Sensor --- 

    this.matter.world.setBounds(
      this.wallOffset, // Use class property
      ceilingY, // NEW Top bound using ceiling
      +this.game.config.width - (this.wallOffset * 2), // Use class property
      floorY - ceilingY, // NEW Height (floor - ceiling)
      undefined, // Thickness (default)
      undefined, // Left wall
      undefined, // Right wall
      false,     // Top collision (handled by explicit body) - WAS TRUE
      true      // Bottom collision (floor) - WAS FALSE
    );
    this.group = this.add.group();

    // Initialize the flash effect pool
    this.flashPool = this.add.group({
      classType: Phaser.GameObjects.Arc, // Use Arc (Circle is a type alias)
      maxSize: 10, // Pool up to 10 flash effects (adjust as needed)
      runChildUpdate: false // Optimization: Don't run update on inactive pool items
    });

    // Create some initial inactive flash objects in the pool
    for (let i = 0; i < 5; i++) {
        const flash = this.add.circle(0, 0, 10, 0xffffff, 0.8).setActive(false).setVisible(false);
        this.flashPool.add(flash, true); // Add silently
    }

    // Restore the light creation but without assigning it to the unused 'light' variable
    this.lights
      .addLight(
        this.input.activePointer.x,
        this.input.activePointer.y,
        1000,
        0x99ffff,
        0.75
      )
      .setScrollFactor(0); 
    // Restore enabling the lights
    this.lights.enable().setAmbientColor(0xdddddd);

    // --- COMMENT OUT Mute and Restart Buttons --- 
    /*
    const buttonSize = 40;
    const buttonMargin = 20;
    const buttonColor = 0x555555;
    const buttonBorderColor = 0xffffff;
    const buttonTextColor = '#ffffff';
    const buttonMutedColor = '#ff0000'; // Color for mute text when muted

    // Position buttons inside the play area walls, slightly lower
    const muteButtonX = +this.game.config.width - this.wallOffset - buttonMargin - (buttonSize / 2); // Use class property
    const muteButtonY = 120; // NEW Y position (below score, above ceiling)

    const muteGraphics = this.add.graphics();
    muteGraphics.fillStyle(buttonColor, 0.8);
    muteGraphics.lineStyle(2, buttonBorderColor, 1);
    muteGraphics.fillRect(-buttonSize / 2, -buttonSize / 2, buttonSize, buttonSize);
    muteGraphics.strokeRect(-buttonSize / 2, -buttonSize / 2, buttonSize, buttonSize);

    // Use Unicode Speaker symbol (High Volume initially)
    const muteText = this.add.text(0, 0, "\u{1F50A}", {
        fontFamily: 'Arial', fontSize: '24px', color: buttonTextColor, align: 'center'
    }).setOrigin(0.5);

    this.muteButtonContainer = this.add.container(muteButtonX, muteButtonY, [muteGraphics, muteText])
        .setSize(buttonSize, buttonSize)
        .setInteractive({ useHandCursor: true })
        .setDepth(25); // High depth
    
    this.muteButtonContainer.on('pointerdown', () => {
        this.sound.mute = !this.sound.mute;
        // Update visual state with correct Unicode symbol
        muteText.setText(this.sound.mute ? "\u{1F507}" : "\u{1F50A}"); // Muted Speaker : Speaker High Volume
        muteText.setColor(this.sound.mute ? buttonMutedColor : buttonTextColor);
    });
    // Set initial visual state with correct Unicode symbol
    muteText.setText(this.sound.mute ? "\u{1F507}" : "\u{1F50A}");
    muteText.setColor(this.sound.mute ? buttonMutedColor : buttonTextColor);

    // --- Restart Button ---
    // Position restart to the left of mute
    const restartButtonX = muteButtonX - buttonSize - buttonMargin; 
    const restartButtonY = muteButtonY; // Align vertically with mute button (NEW Y)

    const restartGraphics = this.add.graphics();
    restartGraphics.fillStyle(buttonColor, 0.8);
    restartGraphics.lineStyle(2, buttonBorderColor, 1);
    restartGraphics.fillRect(-buttonSize / 2, -buttonSize / 2, buttonSize, buttonSize);
    restartGraphics.strokeRect(-buttonSize / 2, -buttonSize / 2, buttonSize, buttonSize);

    // Use Unicode Restart symbol
    const restartText = this.add.text(0, 0, "\u{21BA}", {
        fontFamily: 'Arial', fontSize: '24px', color: buttonTextColor, align: 'center'
    }).setOrigin(0.5);

    this.restartButtonContainer = this.add.container(restartButtonX, restartButtonY, [restartGraphics, restartText])
        .setSize(buttonSize, buttonSize)
        .setInteractive({ useHandCursor: true })
        .setDepth(25); // High depth

    this.restartButtonContainer.on('pointerdown', () => {
        // Prevent restart if game is already over (and showing Play Again)
        if (!this.gameOver) {
           this.scene.restart();
        }
    });
    */
    // --- End COMMENT OUT Mute and Restart Buttons ---

    // Add the score text object
    this.scoreText = this.add.text(this.wallOffset + 10, 100, '0', { // Use class property
      fontFamily: 'sans-serif', 
      fontSize: '64px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4
    }).setOrigin(0, 0.5).setDepth(10); // Left-align (origin 0) vertically centered (0.5)

    // --- REMOVE Ceiling Touch Counter Text ---
    /*
    const counterX = +this.game.config.width - this.wallOffset - 10; // Position opposite score
    const counterY = 100; // Align vertically with score
    this.ceilingTouchCounterText = this.add.text(counterX, counterY, '0', {
      fontFamily: 'sans-serif', // Match score font
      fontSize: '64px',       // Match score font size
      color: '#00ff00',        // Start green
      stroke: '#000000',
      strokeThickness: 4      // Match score stroke
    }).setOrigin(1, 0.5).setDepth(10); // Right-align (origin 1) vertically centered (0.5)
    */
    // --- End REMOVE Counter Text ---

    // --- Populate Gauge Colors ---
    const hexColors = ['3EB24A', '7CC242', '9DCB3B', 'C4D92E', 'E7E621', 'F5EB02', 'F5C913', 'F6951E', 'F15B22', 'E92A28'];
    this.gaugeColors = hexColors.map(hex => Phaser.Display.Color.HexStringToColor(hex).color);
    // --- End Populate Gauge Colors ---

    // --- Create Ceiling Gauge Segments --- 
    const numSegments = 10; // Should match maxTouches
    const segmentHeight = 5; // Height of the gauge line
    const totalGaugeWidth = (+this.game.config.width - this.wallOffset * 2);
    const segmentWidth = totalGaugeWidth / numSegments;
    const inactiveColor = 0xffffff;
    const inactiveAlpha = 0.3;

    for (let i = 0; i < numSegments; i++) {
        const segmentX = this.wallOffset + i * segmentWidth;
        const activeColor = this.gaugeColors[i];

        const segmentGraphics = this.add.graphics({ x: segmentX, y: ceilingY - segmentHeight / 2 });
        segmentGraphics.setData('activeColor', activeColor);
        segmentGraphics.setData('isActive', false); // Track current state

        // Initial draw (inactive)
        segmentGraphics.fillStyle(inactiveColor, inactiveAlpha);
        segmentGraphics.fillRect(0, 0, segmentWidth, segmentHeight);
        segmentGraphics.setDepth(10); // Ensure visibility
        // segmentGraphics.setAlpha(inactiveAlpha); // Set alpha on the object itself

        this.ceilingGaugeSegments.push(segmentGraphics);
    }
    // --- End Create Ceiling Gauge Segments --- 

    this.drawScore(); // Initial score draw

    this.dropper = this.add.image(
      +this.game.config.width / 2, // Use original width
      100, // Start Y above the game over line
      'pie_atlas', // Atlas key
      // Set initial frame later in create using updatePieDropper
      pies[0].assetKey // Keep a default initially, will be overwritten
    );
    // Set initial dropper state using random selection from available pies (up to index 7)
    const initialDroppableRange = this.droppablePieIndices.filter(index => index <= 7);
    this.updatePieDropper(pies[Phaser.Math.RND.pick(initialDroppableRange)]);

    const glow = this.dropper.postFX.addGlow(0x99ddff);
    this.tweens.addCounter({
      yoyo: true,
      repeat: -1,
      from: 1,
      to: 3,
      duration: 1000,
      onUpdate: (tween) => { // Use arrow function for correct 'this' scope
        glow.outerStrength = tween.getValue();
      },
    });

    // --- Create GAME OVER Text (Hidden) ---
    this.gameOverText = this.add.text(
        +this.game.config.width / 2, 
        +this.game.config.height / 2 - 100, // Adjust Y based on new height
        "GAME OVER",
        {
            fontFamily: '"Arial Black", Gadget, sans-serif',
            fontSize: '80px',
            color: '#ffdddd', // Light red/pink
            stroke: '#550000',
            strokeThickness: 6
        }
    ).setOrigin(0.5).setDepth(20).setAlpha(0); // High depth, initially transparent
    // --- End GAME OVER Text ---

    // --- Create Final Score Text (Hidden) ---
    this.finalScoreText = this.add.text(
        +this.game.config.width / 2, 
        +this.game.config.height / 2, // Adjust Y based on new height
        "Final Score: 0", 
        {
            fontFamily: '"Arial Black", Gadget, sans-serif',
            fontSize: '48px',
            color: '#ffffcc', // Light yellow
            stroke: '#333300',
            strokeThickness: 4
        }
    ).setOrigin(0.5).setDepth(20).setAlpha(0); // High depth, initially transparent
    // --- End Final Score Text ---

    // --- Create Play Again Button (Container with Text) ---
    const buttonPadding = 15;
    const buttonText = this.add.text(0, 0, "PLAY AGAIN", {
        fontFamily: '"Arial Black", Gadget, sans-serif',
        fontSize: '32px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 3
    }).setOrigin(0.5);

    const buttonWidth = buttonText.width + buttonPadding * 2;
    const buttonHeight = buttonText.height + buttonPadding * 2;

    const buttonGraphics = this.add.graphics();
    buttonGraphics.fillStyle(0x555555, 0.8); // Background color
    buttonGraphics.lineStyle(3, 0xffffff, 1); // Border
    buttonGraphics.fillRoundedRect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight, 10); // Background
    buttonGraphics.strokeRoundedRect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight, 10); // Border

    this.playAgainButtonContainer = this.add.container(
      +this.game.config.width / 2, 
      +this.game.config.height / 2 + 100, // Adjust Y based on new height
      [buttonGraphics, buttonText] 
    )
    .setSize(buttonWidth, buttonHeight) // Set container size for interaction
    .setInteractive({ useHandCursor: true })
    .on("pointerdown", () => {
      window.location.reload();
    })
    .setVisible(false) // Start hidden
    .setDepth(20); // High depth
    // --- End Play Again Button ---

    this.input.on("pointerup", (pointer: Phaser.Input.Pointer) => {
      // --- Resume Audio Context on first user gesture --- 
      // Check if using Web Audio and context is suspended
      if (this.sound instanceof Phaser.Sound.WebAudioSoundManager && this.sound.context.state === 'suspended') {
        this.sound.context.resume();
        // console.log("AudioContext resumed on user gesture.");
      }
      // --- End Audio Context Check --- 

      // Prevent action if tap is above the game over line (button area)
      const ceilingY = 150; // Use the NEW ceiling value defined in create
      if (pointer.y < ceilingY) {
        // console.log("Click ignored: Above ceiling line.");
        return; 
      }

      // Prevent action if game over or already dropping/animating
      if (!this.dropper.visible || this.gameOver || this.isDropping) {
        return;
      }

      this.isDropping = true; // Set flag

      // --- Calculate target X based on tap, clamping within bounds ---
      const targetX = pointer.x;
      const dropperRadius = this.dropper.displayWidth / 2;
      let clampedX = targetX;
      if (targetX < dropperRadius + this.wallOffset) { // Use class property
          clampedX = dropperRadius + this.wallOffset;
      } else if (targetX > +this.game.config.width - dropperRadius - this.wallOffset) { // Use class property
          clampedX = +this.game.config.width - dropperRadius - this.wallOffset;
      }
      // --- End target calculation ---

      // --- Animate dropper horizontally, then drop --- 
      this.tweens.add({
        targets: this.dropper,
        x: clampedX,
        duration: 150, // Quick animation
        ease: 'Quad.Out', // Smooth easing
        onComplete: () => {
            // --- Drop the pie (original logic, adapted) ---
            this.dropper.setVisible(false); // Hide while dropping

            const currentPie = pies.find(
                (pie) => pie.name === this.dropper.name
            )!;

            // Use the final animation position (clampedX) and create pie BELOW ceiling
            const ceilingY = 150; // Get ceiling Y again for clarity
            const gameObject = this.addPie(
                clampedX, 
                ceilingY + 5,    // NEW: Start drop slightly further below ceiling line
                currentPie
            );
            gameObject.setData('isNew', true); // Flag the dropped pie as new
            gameObject.setData('initialY', ceilingY + 5); // Store initial Y position (where it actually starts falling)
            this.group.add(gameObject);

            // --- Remove Delayed Game Over Check based on settling --- 
            /*
            const ceilingY = 50; 
            const settleCheckDelay = 1500; // ms to wait for settle
            this.time.delayedCall(settleCheckDelay, () => {
                // Check only if the game isn't already over
                // And ensure the dropped pie still exists and has a body
                if (!this.gameOver && gameObject.active && gameObject.body) {
                    const topEdgeY = gameObject.y - gameObject.displayHeight / 2;
                    if (topEdgeY < ceilingY) {
                        console.log("Game Over: Pie settled above ceiling.");
                        this.triggerGameOver();
                    }
                }
            }, [], this); 
            */
            // --- End Remove Delayed Game Over Check ---

            // Select the next pie randomly ONLY from indices up to Key Lime (0-7)
            const maxDropIndex = 7;
            const availableToDrop = this.droppablePieIndices.filter(index => index <= maxDropIndex);
            const nextPieIndex = Phaser.Math.RND.pick(availableToDrop);
            const nextPie = pies[nextPieIndex];
            // Update dropper for the next turn (resets position, makes visible)
            this.updatePieDropper(nextPie); 
            
            // Reset the flag after the drop sequence is essentially done
            this.isDropping = false; 
            // --- End drop logic ---
        }
      });
      
    });

    // --- Add Collision ACTIVE Listener for Sensor --- 
    this.matter.world.on('collisionactive', (event: Phaser.Physics.Matter.Events.CollisionActiveEvent) => {
      for (const pair of event.pairs) {
          let pieBody: MatterJS.BodyType | null = null;

          // Check if one body is the sensor and the other is a pie
          if (pair.bodyA === this.ceilingSensorBody && pair.bodyB.gameObject instanceof Phaser.Physics.Matter.Image) {
              pieBody = pair.bodyB;
          } else if (pair.bodyB === this.ceilingSensorBody && pair.bodyA.gameObject instanceof Phaser.Physics.Matter.Image) {
              pieBody = pair.bodyA;
          }

          // If a pie is colliding with the sensor and it's not 'new', add its ID to the set for this frame
          if (pieBody && 
              pieBody.gameObject && // ADD CHECK: Ensure gameObject exists on body
              this.group.contains(pieBody.gameObject) && // Ensure it's one of our managed pies
              pieBody.gameObject.getData('isNew') !== true) { 
              this.piesTouchingCeilingThisFrame.add(pieBody.id);
          }
      }
    });
    // --- End Collision Active Listener --- 

    this.matter.world.on(
      "collisionstart",
      (event: Phaser.Physics.Matter.Events.CollisionStartEvent) => {
        // Re-enabled merging logic
        const mergeZoneStartY = 200; // Only allow merges below this Y position

        for (const pair of event.pairs) {
          const bodyA = pair.bodyA as MatterJS.BodyType;
          const bodyB = pair.bodyB as MatterJS.BodyType;
          const gameObjectA = bodyA.gameObject;
          const gameObjectB = bodyB.gameObject;

          // --- Check for Game Over: New pie hitting the ceiling --- 
          const isANew = gameObjectA?.getData && gameObjectA.getData('isNew') === true;
          const isBNew = gameObjectB?.getData && gameObjectB.getData('isNew') === true;
          if (!this.gameOver) {
             // --- REMOVE CEILING COLLISION GAME OVER LOGIC --- 
             /*
             if ((isANew && bodyB === this.ceilingBody) || (isBNew && bodyA === this.ceilingBody)) {
                const newPieObject = (isANew ? gameObjectA : gameObjectB) as Phaser.Physics.Matter.Image;
                const initialY = newPieObject.getData('initialY') as number; // Retrieve stored initial Y
                const forceCheckDelay = 150; // ms delay to check velocity/position

                this.time.delayedCall(forceCheckDelay, () => {
                    if (this.gameOver || !newPieObject.active || !newPieObject.body) {
                        return;
                    }
                    
                    const currentVelocityY = newPieObject.body.velocity.y;
                    const currentY = newPieObject.y;

                    // NEW Check: Is the pie's CENTER still above the ceiling line after delay?
                    const ceilingY = 150; // Redefine locally for clarity
                    if (currentY < ceilingY + 2) { 
                        console.log(`Game Over: Pie center (${currentY.toFixed(1)}) stopped above ceiling (${ceilingY}).`);
                        this.triggerGameOver();
                    } 
                }, [], this);
             }
             */
             // --- END REMOVED CEILING COLLISION LOGIC --- 
          }
          // --- End Ceiling Hit Check --- 

          // --- Play Sound on First Contact --- 
          if (gameObjectA instanceof Phaser.GameObjects.Image && gameObjectB instanceof Phaser.GameObjects.Image) {
              const isANew = gameObjectA.getData('isNew') === true;
              const isBNew = gameObjectB.getData('isNew') === true;

              // Play if exactly one is new (XOR)
              if (isANew !== isBNew) { 
                  this.sound.play('squish', { volume: 0.5 }); // Play sound (adjust volume as needed)
                  
                  let newPieObject = isANew ? gameObjectA : gameObjectB;
                  let oldPieObject = isANew ? gameObjectB : gameObjectA;

                  // Remove announcement logic from collision - moved to animateMerge
                  /*
                  // Announce the SMALL pies (0, 1, 2) on their first valid collision (landing)
                  const pieIndex = pies.findIndex(p => p.name === newPieObject.name);
                  if (pieIndex <= 2 && !this.announcedPieIndices.has(pieIndex)) { 
                      this.announcedPieIndices.add(pieIndex); // Add to set
                      // console.log(`Announcing small pie landing: ${pies[pieIndex].name}`);
                      this.announceNewPie(pies[pieIndex], pieIndex); 
                  }
                  */
                  
                  // Remove the 'isNew' flag from the new pie
                  newPieObject.setData('isNew', false);
              }
          }
          // --- End Play Sound --- 

          // --- Merging Logic --- 
          // Ensure both colliding objects are valid Images managed by our group
          if (
            gameObjectA instanceof Phaser.GameObjects.Image &&
            gameObjectB instanceof Phaser.GameObjects.Image &&
            gameObjectA?.name === gameObjectB?.name &&
            this.group.contains(gameObjectA) && 
            this.group.contains(gameObjectB) &&
            // --- Add check: Ensure neither pie is already merging ---
            !gameObjectA.getData('isMerging') && 
            !gameObjectB.getData('isMerging') &&
            // --- Add check: Collision point is below the drop zone ---
            pair.collision.supports.length > 0 && // Check if contact point exists
            pair.collision.supports[0].y > mergeZoneStartY
           ) {
            const pieName = gameObjectA.name;
            const pieIndex = pies.findIndex(
              (pie) => pie.name === pieName
            );

            // --- Mark both pies as merging --- 
            gameObjectA.setData('isMerging', true);
            gameObjectB.setData('isMerging', true);

            // Check if it's not the largest pie (Pizza Pie, now last index)
            if (pieIndex < pies.length - 1) {
              const nextPie = pies[pieIndex + 1];
              this.sound.play('merge', { volume: 0.6 }); // Play merge sound before animation
              this.animateMerge(
                  gameObjectA as Phaser.Physics.Matter.Image, // Cast is safe here due to instanceof check
                  gameObjectB as Phaser.Physics.Matter.Image,
                  nextPie,
                  pieIndex 
              );
            } else {
               // Handle collision of the largest pie (Pizza Pie) 
               // Remove instantly (no animation needed, merging flag is irrelevant as they vanish)
               this.sound.play('merge', { volume: 0.6 }); // Play merge sound before removing
               this.group.remove(gameObjectA, true, true);
               this.group.remove(gameObjectB, true, true);
               this.score += (pieIndex + 1) * 10; 
               this.drawScore();
               // No need to clear 'isMerging' flag as objects are destroyed
            }
          }
        }
        // End of re-enabled merge logic
      }
    );

    // --- REMOVE Duplicate Update Logic Block --- 
    /*
    // --- New Update Logic for Sensor Count --- 
    const ceilingTouchCount = this.piesTouchingCeilingThisFrame.size;
    const maxTouches = 15; // Increased threshold from 10 to 15

    // Update Counter Text
    this.ceilingTouchCounterText.setText(ceilingTouchCount.toString());
    
    // Update Counter Color (Green to Red)
    const colorRatio = Phaser.Math.Clamp(ceilingTouchCount / maxTouches, 0, 1);
    const interpolatedColor = Phaser.Display.Color.Interpolate.ColorWithColor(
        new Phaser.Display.Color(0, 255, 0), // Green
        new Phaser.Display.Color(255, 0, 0), // Red
        1, // Range (always 1 for 0-1 ratio)
        colorRatio
    ).color; // Get numeric color value
    this.ceilingTouchCounterText.setColor(Phaser.Display.Color.ValueToColor(interpolatedColor).rgba);

    // Check Game Over Condition
    if (ceilingTouchCount >= maxTouches) {
        console.log(`Game Over: Ceiling touch count reached ${ceilingTouchCount}`);
        this.triggerGameOver();
        return;
    }

    // Clear the set for the next frame's collision checks
    this.piesTouchingCeilingThisFrame.clear();
    // --- End New Update Logic --- 
    */
    // --- End REMOVE Duplicate Logic ---

  }

  update(time: number, delta: number) { // Add time and delta
    if (this.gameOver) return; // Do nothing if game is over

    // --- Update Logic for Sensor Count & Gauge --- 
    const ceilingTouchCount = this.piesTouchingCeilingThisFrame.size;
    const maxTouches = 10; // Reset threshold to 10

    // --- REMOVE Counter Text Update ---
    // this.ceilingTouchCounterText.setText(ceilingTouchCount.toString());
    
    // Calculate Color Ratio (Green to Red)
    const colorRatio = Phaser.Math.Clamp(ceilingTouchCount / maxTouches, 0, 1);
    const interpolatedColor = Phaser.Display.Color.Interpolate.ColorWithColor(
        new Phaser.Display.Color(0, 255, 0), // Green
        new Phaser.Display.Color(255, 0, 0), // Red
        1, // Range (always 1 for 0-1 ratio)
        colorRatio
    ).color; // Get numeric color value
    // --- REMOVE Counter Color Update ---
    // this.ceilingTouchCounterText.setColor(Phaser.Display.Color.ValueToColor(interpolatedColor).rgba);

    // --- Redraw Boundaries (no ceiling line) --- 
    this.boundsGraphics.clear(); // Clear previous lines
    const rightWallX = +this.game.config.width - this.wallOffset;
    const floorY = 900;
    const ceilingY = 150; // RE-ADD declaration inside update scope
    // Use outer scope ceilingY here:
    this.boundsGraphics.lineStyle(1, 0xffffff, 1);
    this.boundsGraphics.moveTo(this.wallOffset, ceilingY); // Start top-left near gauge
    this.boundsGraphics.lineTo(this.wallOffset, floorY); 
    this.boundsGraphics.moveTo(this.wallOffset, floorY); // Floor
    this.boundsGraphics.lineTo(rightWallX, floorY); 
    this.boundsGraphics.moveTo(rightWallX, ceilingY); // Start top-right near gauge
    this.boundsGraphics.lineTo(rightWallX, floorY); 
    this.boundsGraphics.strokePath(); // Draw walls/floor

    // --- REMOVE Ceiling Gauge Segment Drawing from boundsGraphics --- 
    /*
    const gaugeWidth = rightWallX - this.wallOffset;
    const numSegments = 10; // Should match maxTouches
    const segmentWidth = gaugeWidth / numSegments;
    const segmentHeight = 5; // Height of the gauge line
    const gaugeBgColor = 0x555555;

    for (let i = 0; i < numSegments; i++) {
        const segmentX = this.wallOffset + i * segmentWidth;
        const fillColor = (i < ceilingTouchCount) ? this.gaugeColors[i] : gaugeBgColor;
        const fillAlpha = (i < ceilingTouchCount) ? 1 : 0.6;

        this.boundsGraphics.fillStyle(fillColor, fillAlpha);
        this.boundsGraphics.fillRect(segmentX, ceilingY - segmentHeight / 2, segmentWidth, segmentHeight);
    }
    */
    // --- End REMOVE Redraw Logic --- 

    // --- Update Separate Gauge Segments --- 
    const inactiveColor = 0xffffff;
    const inactiveAlpha = 0.3;
    const tweenDuration = 150; // ms for fade

    this.ceilingGaugeSegments.forEach((segmentGraphics, index) => {
        const shouldBeActive = index < ceilingTouchCount;
        const currentlyActive = segmentGraphics.getData('isActive');
        const activeColor = segmentGraphics.getData('activeColor');

        // Determine target color and alpha based on desired state
        const targetColor = shouldBeActive ? activeColor : inactiveColor;
        const targetAlpha = shouldBeActive ? 1 : inactiveAlpha;

        // Update appearance (redraw necessary) and state data
        segmentGraphics.clear();
        segmentGraphics.fillStyle(targetColor, segmentGraphics.alpha); // Use current alpha for redraw
        const segmentWidth = (+this.game.config.width - this.wallOffset * 2) / 10;
        const segmentHeight = 5;
        segmentGraphics.fillRect(0, 0, segmentWidth, segmentHeight);
        segmentGraphics.setData('isActive', shouldBeActive);

        // Tween alpha if state changed
        if (shouldBeActive !== currentlyActive) {
            this.tweens.add({
                targets: segmentGraphics,
                alpha: targetAlpha,
                duration: tweenDuration,
                ease: 'Linear'
            });
        }
    });
    // --- End Update Separate Segments --- 

    // Check Game Over Condition
    if (ceilingTouchCount >= maxTouches) { // Uses maxTouches = 10
        console.log(`Game Over: Ceiling touch count reached ${ceilingTouchCount}`);
        this.triggerGameOver();
        return;
    }

    // Clear the set for the next frame's collision checks
    this.piesTouchingCeilingThisFrame.clear();
    // --- End Update Logic --- 

  }

  // This method will be repurposed for the Pie Packing end condition
  triggerGameOver() {
    if (this.gameOver) return; // Prevent multiple triggers

    this.gameOver = true;
    this.dropper.setVisible(false);
    // this.timeOverLine = 0; // Remove reference to non-existent property
    // console.log("Game Over sequence started");
    this.sound.play('wompwomp', { volume: 0.7 }); // Play game over sound

    // Fade in GAME OVER text
    this.tweens.add({
        targets: this.gameOverText,
        alpha: 1,
        duration: 500,
        ease: 'Linear'
    });

    // Pie popping sequence
    const piesToPop = this.group.getChildren().slice(); // Create a copy
    Phaser.Utils.Array.Shuffle(piesToPop); // Shuffle for random order

    const popDelay = 50; // Delay between each pop (ms)
    let totalDelay = 500; // Start after GAME OVER text fade-in
    const basePopScore = 5; // Score per pie popped

    piesToPop.forEach((pieObject, index) => {
        if (pieObject instanceof Phaser.Physics.Matter.Image) {
            this.time.addEvent({ // Use addEvent for staggered delay
                delay: totalDelay + index * popDelay,
                callback: () => {
                    // Add check: Ensure pieObject itself exists and is IN THE GROUP before proceeding
                    if (!pieObject || !this.group.contains(pieObject as Phaser.Physics.Matter.Image)) return; 

                    // Check if active and HAS A BODY before proceeding
                    // Need to cast to Matter.Image to check body safely
                    const matterPieObject = pieObject as Phaser.Physics.Matter.Image;
                    // Combine checks: If not in group, not active, or no body, skip.
                    if (!matterPieObject.active || !matterPieObject.body) return; 

                    // --- Checks passed, proceed with animation --- 
                    // Store angle before potentially modifying body state
                    const currentAngle = matterPieObject.angle;

                    // Add score
                    this.score += basePopScore; 
                    this.drawScore();

                    // Make body static BEFORE tweening scale to prevent physics interference
                    // Ensure body still exists right before setting static
                    if (!matterPieObject.body) return; // Final check before static
                    matterPieObject.setStatic(true);

                    // Pop animation - Only start if checks passed
                    const popTween = this.tweens.add({
                        targets: matterPieObject, // Target the casted object
                        scale: 0,
                        angle: currentAngle + 180, // Spin while shrinking
                        duration: 200,
                        ease: 'Sine.easeInOut',
                        onComplete: () => {
                            // Body is static, just destroy the GameObject
                            // Add final check before destroy
                            if (matterPieObject.active && this.group.contains(matterPieObject)) { 
                              this.group.remove(matterPieObject, true, true); // Remove from group and destroy
                            }
                            
                            // If this is the last pie popped, show the button and final score
                            if (index === piesToPop.length - 1) {
                                this.showGameOverUI();
                            }
                        }
                    });

                    // Add listener to stop tween if object is destroyed prematurely
                    matterPieObject.once('destroy', () => {
                        if (popTween && popTween.isPlaying()) {
                            // console.log('Stopping pop tween for destroyed object');
                            popTween.stop();
                        }
                    });

                } // End main callback logic
            }); // End time.addEvent
        }
    });

    // Handle case where there are no pies to pop
    if (piesToPop.length === 0) {
         this.time.delayedCall(totalDelay, () => {
            // console.log("No pies to pop, showing final score and Play Again");
            this.finalScoreText.setText(`Final Score: ${this.score}`);
            this.finalScoreText.setAlpha(1); // Make visible
            this.playAgainButtonContainer.setVisible(true);
         }, [], this);
    }
  }

  showGameOverUI() {
    // Implement the logic to show the game over UI
    // This method should be implemented to handle the display of the game over UI
  }
} // End of Main Scene

// Remove Device Detection for Scaling 
/*
// Use standard browser checks before Phaser initializes
const isMobileAgent = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
const hasTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
// Consider mobile if it has touch OR if user agent looks mobile (covers more bases)
const isLikelyMobile = hasTouch || isMobileAgent; 

const scaleMode = isLikelyMobile ? Phaser.Scale.ENVELOP : Phaser.Scale.FIT;
console.log(`Device detected as: ${isLikelyMobile ? 'Mobile' : 'Desktop'}. Using scale mode: ${scaleMode === Phaser.Scale.ENVELOP ? 'ENVELOP' : 'FIT'}`);
*/

// Phaser game configuration
const config: Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 720,      
  height: 1000,    // REDUCE height for squarer playfield
  parent: "app",     
  transparent: true, 
  physics: {
    default: "matter",
    matter: {
      gravity: { x: 0, y: 4 }, 
      debug: false, // Debug off
    },
  },
  scale: {
    mode: Phaser.Scale.FIT, // FORCE FIT mode for all devices
    autoCenter: Phaser.Scale.CENTER_BOTH, 
    width: 720, 
    height: 1000, // Match REDUCED design height
  },
  scene: Main, 
};

new Phaser.Game(config);

import './style.css'; 