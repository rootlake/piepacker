import "./style.css";

// Add specific Phaser imports for clarity and type checking
import Phaser, { Types } from 'phaser';
// import { experimentalPhysics } from './physics'; // Remove incorrect import
import { Pie, pies } from './pies'; // Import pie data


// Physics configuration type for Matter.js bodies
type PhysicsConfig = {
  friction: number;      // Friction between bodies
  bounce: number;        // Restitution/bounciness
  density?: number;      // Mass per unit area
  frictionAir?: number;  // Air resistance
  frictionStatic?: number; // Static friction threshold  
  slop?: number;        // Collision tolerance
};

// Example experimental config
const experimentalPhysics: PhysicsConfig = {
  friction: 0.05,       // Increased friction (less slippery)
  bounce: 0.1,          // Reduced bounce
  frictionStatic: 0.2,  // Added static friction (stickiness)
  // You can add density, frictionAir, slop here too
};

// REMOVED pies constant definition (moved to pies.ts)
// const pies: Pie[] = [
//   { name: "Lemon Tart", radius: 20, assetKey: "lemon_tart" },         // Smallest
//   ...
//   { name: "Pizza Pie", radius: 148, assetKey: "pizza_pie" },      // Largest
// ];

class Main extends Phaser.Scene {
  // --- Constants ---
  private readonly CEILING_Y = 220; // Lowered further to accommodate dropper below scaled top logo
  private readonly FLOOR_Y = 995; // REVERTED floor back low
  private readonly WALL_OFFSET = 15; // REDUCED offset (wider playfield)
  private readonly MAX_CEILING_TOUCHES = 6; // Keep lower limit for now
  // private readonly INITIAL_DROPPER_RANGE_MAX_INDEX = 3; // OLD: REMOVED - Not used
  private readonly SCORE_TEXT_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
    fontFamily: 'sans-serif',
    fontSize: '56px',
    color: '#ffffff',
    stroke: '#000000',
    strokeThickness: 6
  };
  private readonly GAME_OVER_TEXT_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
    fontFamily: '"Arial Black", Gadget, sans-serif',
    fontSize: '80px',
    color: '#ffdddd',
    stroke: '#550000',
    strokeThickness: 6
  };
  private readonly FINAL_SCORE_TEXT_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
    fontFamily: '"Arial Black", Gadget, sans-serif',
    fontSize: '48px',
    color: '#ffffcc',
    stroke: '#333300',
    strokeThickness: 4
  };
    private readonly PLAY_AGAIN_BUTTON_TEXT_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
    fontFamily: '"Arial Black", Gadget, sans-serif',
    fontSize: '32px',
    color: '#ffffff',
    stroke: '#000000',
    strokeThickness: 3
  };
  private readonly COUNTER_TEXT_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: 'sans-serif',
      fontSize: '56px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3
  };
  private readonly COUNTER_CIRCLE_RADIUS = 30;
  private readonly COLOR_GREEN = 0x3EB24A;
  private readonly INDICATOR_COLORS = [
    0x3EB24A, 0x7CC242, 0x9DCB3B, 0xC4D92E, 0xE7E621, 
    0xF5EB02, 0xF5C913, 0xF6951E, 0xF15B22, 0xE92A28
  ];
  private readonly STABLE_TOUCH_DURATION = 500; // ms a pie must touch before counting
  private readonly STRAIN_SOUND_INTERVAL = 5000; // ms between strain sounds
  
  // Announcement style constant (can be moved near others if preferred)
  private readonly NEW_ANNOUNCEMENT_TEXT_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: '"Arial Black", sans-serif', // Use Arial Black primarily
      fontSize: '48px',
      color: '#FFFF99', // Light yellow
      stroke: '#663300',
      strokeThickness: 4,
      align: 'center',
      letterSpacing: -2 // ADDED: Tighten letter spacing
  };
  
  private readonly MENU_ITEM_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: 'sans-serif', // Use same as score
      fontSize: '40px', // Slightly smaller than score
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4,
      // ADDED background/padding to simulate border
      backgroundColor: '#444444', // Dark grey background
      padding: { x: 15, y: 5 } // Add horizontal and vertical padding
  };
  
  // --- State & Game Objects ---
  score = 0;
  dropper!: Phaser.GameObjects.Image;
  group!: Phaser.GameObjects.Group;
  isGameOver = false;
  isGameActive = false; // ADDED: Flag to control update loop logic
  scoreText!: Phaser.GameObjects.Text;
  isDropping = false;
  announcedPieIndices: Set<number> = new Set();
  isAnnouncing = false;
  availableTemplates: string[] = [];
  flashPool!: Phaser.GameObjects.Group;
  gameOverText!: Phaser.GameObjects.Text; 
  playAgainButtonContainer!: Phaser.GameObjects.Container;
  pieFragmentPool!: Phaser.GameObjects.Group;
  finalScoreText!: Phaser.GameObjects.Text; 
  muteButtonContainer!: Phaser.GameObjects.Container; // Keep commented out usage later
  restartButtonContainer!: Phaser.GameObjects.Container; // Keep commented out usage later
  droppablePieIndices: number[] = [0, 1, 2, 3]; // NEW: Start with only first 4 indices
  ceilingBody!: MatterJS.BodyType;
  boundsGraphics!: Phaser.GameObjects.Graphics;
  ceilingSensorBody!: MatterJS.BodyType;
  _ceilingTouchTimers = new Map<number, number>(); // ADDED: bodyId -> touchStartTime
  ceilingBarGraphics!: Phaser.GameObjects.Graphics;
  ceilingCounterText!: Phaser.GameObjects.Text;
  ceilingCounterBg!: Phaser.GameObjects.Graphics;
  _currentDisplayedCeilingCount = 0;
  private _lastStrainSoundPlayTime: { [key: string]: number } = {}; // Track last play time for each squeak
  private _hasReachedSighThreshold: boolean = false; // Added for sigh sound logic
  private _timeAtZeroStart: number | null = null; // Tracks when count first hit 1 or 0
  private _previousCeilingTouchCount = 0; // ADDED: Track count from previous frame for sound triggers
  titleLogo!: Phaser.GameObjects.Image;
  titlePlayButton!: Phaser.GameObjects.Image;
  titleMenuButton!: Phaser.GameObjects.Image;
  topLogo!: Phaser.GameObjects.Image; // ADDED property for in-game logo
  isInMenu = false;
  menuBackground!: Phaser.GameObjects.Rectangle;
  muteToggleRect!: Phaser.GameObjects.Rectangle;
  muteCheckmark!: Phaser.GameObjects.Graphics;
  restartButton!: Phaser.GameObjects.Text;
  leaderboardButton!: Phaser.GameObjects.Text;

  // --- New State for Staged Pie Introduction --- 
  private maxDroppablePieIndex = 3; // Indices 0-3 can drop initially
  private highestPieCreatedIndex = 3; // Tracks highest pie created via merge
  private dropsSinceMediumPieUnlock = 0; // Counter for unlocking next tier
  private readonly DROPS_TO_UNLOCK_NEXT_PIE = 10; // Drops required after creating a new medium pie
  private readonly MAX_DROPPABLE_PIE_INDEX = 9; // Oreo Pie - largest that can be dropped
  private nextSequentialDropIndex = 0; // Used for sequential dropping test

  // --- Lifecycle Methods ---
  preload() {
    // Load the combined pie texture atlas with updated path
    this.load.atlas('pie_atlas', 'assets/sprites/pie_atlas.png', 'assets/sprites/pie_atlas.json');

    // Load sounds with updated paths
    // this.load.audio('creak', ['assets/sounds/creak1.ogg', 'assets/sounds/creak1.aac']);
    // this.load.audio('merge', ['assets/sounds/merge1.ogg', 'assets/sounds/merge1.aac']);
    // this.load.audio('squish', ['assets/sounds/squish1.ogg', 'assets/sounds/squish1.aac']); // Keep commented for now
    this.load.audio('wompwomp', ['assets/sounds/wompwomp.ogg', 'assets/sounds/wompwomp.aac']);

    // Load single pop sound with fallbacks using CORRECT short names
    this.load.audio('pop', [
        'assets/sounds/pop.ogg', 
        'assets/sounds/pop.aac'
    ]);

    // Load squeak/strain sounds with fallbacks using CORRECT short names
    this.load.audio('squeak1', [
        'assets/sounds/squeak1.ogg',
        'assets/sounds/squeak1.aac'
    ]);
    this.load.audio('squeak2', [
        'assets/sounds/squeak2.ogg',
        'assets/sounds/squeak2.aac'
    ]);
    this.load.audio('squeak3', [
        'assets/sounds/squeak3.ogg',
        'assets/sounds/squeak3.aac'
    ]);

    // Load sigh sound with fallbacks using CORRECT short names
    this.load.audio('sigh', [
        'assets/sounds/sigh.ogg',
        'assets/sounds/sigh.aac'
    ]);
   
    // Load UI graphics
    this.load.image('gamelogo', 'assets/images/gamelogo.png');
    this.load.image('playbutton', 'assets/images/playbutton.png');
    this.load.image('menubutton', 'assets/images/menubutton.png');
    this.load.image('toplogo', 'assets/images/toplogo.png');

    // Load the pie texture atlas
    // ... existing code ...
  }

  create() {
    console.log("Running create...");

    // --- Title Screen Elements & Animations ---
    const logoX = +this.game.config.width / 2;
    const logoY = +this.game.config.height / 3; // REVERTED: Position center 1/3 down
    this.titleLogo = this.add.image(logoX, logoY, 'gamelogo') 
      .setScale(0) 
      .setOrigin(0.5, 0.5) // NEW: Center-center origin
      .setDepth(100);

    // Button properties
    const logoHeight = 512; // Assume original height
    const buttonScale = 0.5; 
    const buttonHeight = 150 * buttonScale; 
    const desiredGap = 80; // INCREASED gap

    // Recalculate positions relative to logo CENTER + half logo height
    const playButtonY = logoY + (logoHeight / 2) + desiredGap;
    const menuButtonY = playButtonY + (buttonHeight / 2) + (buttonHeight / 2) + desiredGap; 

    // Create Play Button (initially scaled to 0)
    this.titlePlayButton = this.add.image(logoX, playButtonY, 'playbutton')
      .setOrigin(0.5)
      .setScale(0)
      .setInteractive({ useHandCursor: true })
      .setDepth(100);
    this.titlePlayButton.on('pointerdown', () => { this._startGame(); });

    // Create Menu Button (initially scaled to 0)
    this.titleMenuButton = this.add.image(logoX, menuButtonY, 'menubutton')
      .setOrigin(0.5)
      .setScale(0)
      .setInteractive({ useHandCursor: true })
      .setDepth(100);
    this.titleMenuButton.on('pointerdown', () => { 
        this._showMenuScreen(); // NEW: Show menu
    });

    // Animate Logo
    this.tweens.add({
      targets: this.titleLogo,
      scale: 1, 
      duration: 1000, 
      ease: 'Back.Out'
      // Removed onComplete as buttons animate separately now
    });

    // Animate Buttons (slightly delayed)
    this.tweens.add({
        targets: [this.titlePlayButton, this.titleMenuButton],
        scale: buttonScale, 
        duration: 500, 
        ease: 'Back.Out',
        delay: 200 // Start buttons animation shortly after logo starts
    });
    // --- End Title Screen Elements & Animations ---

    // --- Main Game Setup (Now happens in _startGame) ---

    // --- Initial Listeners (Needed for Title Screen & Game) ---
    // Add pointerup listener here, it will be used by _handlePointerUp later
    this.input.on('pointerup', this._handlePointerUp, this); 
    // Add resize listener here
    this.scale.on('resize', () => { 
        this._handleResize(); // Call original resize handler
    }, this);
    this._handleResize(); // Call once for initial screen size

    // --- Initialize New State --- (Added in create)
    this.maxDroppablePieIndex = 3; 
    this.highestPieCreatedIndex = 3;
    this.dropsSinceMediumPieUnlock = 0;
    this.nextSequentialDropIndex = 0;
  }

  update(/* time: number, delta: number */) {
    // Only run game logic if the game is active (past title screen)
    if (this.isGameActive && !this.isGameOver) { 
        this._updateUIIndicators();
        // this._redrawBoundaries(); // REMOVED: Don't draw visual walls
        this._checkGameOverCondition();
    }

    // --- Cleanup falling title elements --- 
    const screenBottom = +this.game.config.height + 200; // Position well below screen
    [this.titleLogo, this.titlePlayButton, this.titleMenuButton].forEach(element => {
        // Check element exists, has a body, and is off-screen
        if (element && element.body && element.y > screenBottom) {
            // Remove body from Matter world IF it exists
            if (element.body) { 
                 this.matter.world.remove(element.body);
            }
            element.destroy(); // Destroy the GameObject
        }
    });
  }

  // --- Core Gameplay Methods ---
  updatePieDropper(pie: Pie) {
    this.isDropping = true;

    const targetY = this.CEILING_Y - pie.radius - 10; // Position above ceiling line
    const centerX = +this.game.config.width / 2;
    const startY = -pie.radius; // REVERTED: Start above screen
    // const startY = this.topLogo ? this.topLogo.y + this.topLogo.displayHeight / 2 : -pie.radius; 
    // const startX = this.topLogo ? this.topLogo.x : centerX;

    this.dropper
      .setTexture('pie_atlas', pie.assetKey)
      .setName(pie.name)
      .setDisplaySize(pie.radius * 2, pie.radius * 2)
      .setPosition(centerX, startY) // REVERTED: Use centerX, startY
      .setVisible(true);
    
    // Tween to the target position just above the ceiling
    this.tweens.add({
        targets: this.dropper,
        y: targetY,
        duration: 200, // Consider making constant
        ease: 'Cubic.Out',
        onComplete: () => {
            this.isDropping = false;
        }
    });

    // Highlight matching pies
    this.group.getChildren().forEach((gameObject: Phaser.GameObjects.GameObject) => {
      if (gameObject instanceof Phaser.GameObjects.Image) {
        gameObject.postFX.clear();
        if (gameObject.name === pie.name) {
          gameObject.postFX.addShine();
        }
      }
    });
  }

  addPie(x: number, y: number, pie: Pie): Phaser.Physics.Matter.Image {
    const gameObject = this.matter.add
      .image(x, y, 'pie_atlas', pie.assetKey)
      .setName(pie.name)
      .setDisplaySize(pie.radius * 2, pie.radius * 2)
      .setCircle(pie.radius)
      .setFriction(experimentalPhysics.friction)
      .setBounce(experimentalPhysics.bounce)
      .setFrictionStatic(experimentalPhysics.frictionStatic ?? 0) 
      .setDepth(-1);
    return gameObject;
  }

  drawScore() {
    this.scoreText.setText(this.score.toString());
  }

  animateMerge(pieA: Phaser.Physics.Matter.Image, pieB: Phaser.Physics.Matter.Image, nextPie: Pie, pieIndex: number) {
    pieA.setStatic(true);
    pieB.setStatic(true);

    const mergeX = (pieA.x + pieB.x) / 2;
    const mergeY = (pieA.y + pieB.y) / 2;
    const shrinkDuration = 150; // Consider constant
    const flashBaseDuration = 200; // Consider constant
    const flashBaseScale = 5; // Consider constant
    const largeMergeThreshold = 5; // Consider constant
    const ringDelay = 50; // Consider constant

    // Keep references to tweens
    let tweenA: Phaser.Tweens.Tween | null = null;
    let tweenB: Phaser.Tweens.Tween | null = null;

    let completedTweens = 0;
    const totalTweens = 2;

    const onTweenComplete = () => {
      completedTweens++;
      if (completedTweens === totalTweens) {
        // Add Flash Effect
        const isLargeMerge = pieIndex >= largeMergeThreshold;
        const numberOfRings = isLargeMerge ? 3 : 1;
        const flashFinalScale = flashBaseScale * (isLargeMerge ? 1.5 : 1);
        const flashEffectDuration = flashBaseDuration * (isLargeMerge ? 1.2 : 1);

        for (let i = 0; i < numberOfRings; i++) {
            const flash = this.flashPool.get(mergeX, mergeY) as Phaser.GameObjects.Arc;
            if (!flash) continue;
            flash.setRadius(nextPie.radius * 0.5)
                 .setFillStyle(0xffffff, 0.8)
                 .setDepth(-0.5)
                 .setScale(0)
                 .setActive(true)
                 .setVisible(true);
            this.tweens.add({
                targets: flash,
                scale: flashFinalScale,
                alpha: 0,
                duration: flashEffectDuration,
                delay: i * ringDelay,
                ease: 'Quad.Out',
                onComplete: () => { this.flashPool.killAndHide(flash); }
            });
        }

        // --- Pie Fragment Particle Burst --- 
        const mergingPieTextureKey = pieA.texture.key; 
        const mergingPieFrameName = pieA.frame.name; 
        const numParticles = (3 + pieIndex) * 2; // NEW formula (doubled)

        for (let i = 0; i < numParticles; i++) {
            const particle = this.pieFragmentPool.get(mergeX, mergeY) as Phaser.GameObjects.Image;
            if (!particle) continue; // Skip if pool is empty (shouldn't happen)

            particle
                .setTexture(mergingPieTextureKey, mergingPieFrameName) // Set correct texture
                .setOrigin(0.5)
                .setDepth(10) // Ensure visibility
                .setScale(0.3) // NEW: Start small but visible
                .setAlpha(1)
                .setActive(true)
                .setVisible(true);

            // Animation properties
            const angle = Phaser.Math.DegToRad(Phaser.Math.RND.between(0, 360));
            const distance = Phaser.Math.RND.between(100, 200); // NEW further range
            const duration = Phaser.Math.RND.between(500, 800);
            const targetX = mergeX + Math.cos(angle) * distance;
            const targetY = mergeY + Math.sin(angle) * distance;

            this.tweens.add({
                targets: particle,
                x: targetX,
                y: targetY,
                scale: 0, // NEW: Shrink to nothing
                angle: Phaser.Math.RND.between(-360, 360), // Random rotation
                duration: duration,
                ease: 'Quad.Out',
                onComplete: () => {
                    this.pieFragmentPool.killAndHide(particle);
                }
            });
        }
        // --- End Particle Burst ---

        // More robust cleanup BEFORE destroying old pies
        if (tweenA && tweenA.isPlaying()) { tweenA.stop(); }
        if (tweenB && tweenB.isPlaying()) { tweenB.stop(); }

        if (pieA.body) { this.matter.world.remove(pieA.body); }
        if (pieB.body) { this.matter.world.remove(pieB.body); }

        // Now destroy GameObjects
        if (pieA.active) { pieA.destroy(); }
        if (pieB.active) { pieB.destroy(); }

        // --- End Robust Cleanup ---

        // Create and animate new pie
        const newPieObject = this.addPie(mergeX, mergeY, nextPie);
        this.group.add(newPieObject);
        newPieObject.setData('isNew', true);

        // --- Update Highest Pie Created & Unlock Logic ---
        const nextPieIndex = pies.findIndex(p => p.name === nextPie.name);
        if (nextPieIndex > this.highestPieCreatedIndex) {
            this.highestPieCreatedIndex = nextPieIndex;
            console.log(`New highestPieCreatedIndex: ${this.highestPieCreatedIndex}`);
            // REMOVED: Resetting dropsSinceMediumPieUnlock here caused issues with rapid merges.
            // The counter will only reset after a successful unlock in _handlePointerUp.
            // if (nextPieIndex >= 4 && nextPieIndex <= 12 && nextPieIndex > this.maxDroppablePieIndex) {
            //     this.dropsSinceMediumPieUnlock = 0;
            //     console.log(`Reset dropsSinceMediumPieUnlock for ${nextPie.name}`);
            // }
        }
        // --- End Update --- 

        // Check if the NEWLY MERGED pie needs announcement
        this._checkAndAnnounceNewPie(nextPie, nextPieIndex);
      }
    };

    // Shrink/spin tweens for original pies
    tweenA = this.tweens.add({ targets: pieA, scale: 0, angle: pieA.angle + 360, x: mergeX, y: mergeY, duration: shrinkDuration, ease: 'Sine.InOut', onComplete: onTweenComplete });
    tweenB = this.tweens.add({ targets: pieB, scale: 0, angle: pieB.angle - 360, x: mergeX, y: mergeY, duration: shrinkDuration, ease: 'Sine.InOut', onComplete: onTweenComplete });

    // Stop tweens if objects destroyed prematurely (e.g., game over)
    pieA.once('destroy', () => { if (tweenA && tweenA.isPlaying()) { tweenA.stop(); } });
    pieB.once('destroy', () => { if (tweenB && tweenB.isPlaying()) { tweenB.stop(); } });
  }

  announceNewPie(pie: Pie, /* pieIndex: number */) { // REMOVED unused pieIndex parameter again
    if (this.isAnnouncing) return;
    this.isAnnouncing = true;

    // Use just the pie name
    const announcementString = pie.name.toUpperCase();

    // Calculate position (unchanged)
    const playfieldHeight = this.FLOOR_Y - this.CEILING_Y;
    const targetY = this.CEILING_Y + (playfieldHeight / 3); 

    // Create text object using NEW style
    const announcementText = this.add.text(
        +this.game.config.width / 2, targetY, announcementString, this.NEW_ANNOUNCEMENT_TEXT_STYLE
    ).setOrigin(0.5).setAlpha(0).setScale(0.5).setDepth(10)
     // .setShadow(2, 2, '#000000', 2, true, true); // Optionally remove shadow

    // Word wrapping (Might not be needed if names are short)
    const playAreaWidth = +this.game.config.width - (this.WALL_OFFSET * 2);
    const textPadding = 40; 
    const maxWidth = playAreaWidth - textPadding; 
    announcementText.setScale(1).setAlpha(1); // Measure at full size
    if (announcementText.width > maxWidth) {
        announcementText.setStyle({ wordWrap: { width: maxWidth, useAdvancedWrap: true } });
        announcementText.setOrigin(0.5); // Recenter
    }
    announcementText.setScale(0.5).setAlpha(0); // Revert for animation

    // Animation
    this.tweens.add({
        targets: announcementText, alpha: 1, scale: 1, duration: 300, ease: 'Power2',
        onComplete: () => {
            this.time.delayedCall(1000, () => { // Consider constant for hold duration
                this.tweens.add({
                    targets: announcementText, alpha: 0, duration: 500, ease: 'Power1',
                    onComplete: () => {
                        announcementText.destroy();
                        this.isAnnouncing = false;
                    }
                });
            });
        }
    });
  }

  triggerGameOver() {
    if (this.isGameOver) return;
    this.isGameOver = true;
    this.dropper.setVisible(false);
    this.sound.play('wompwomp', { volume: 0.7 });

    // Fade in GAME OVER text
    this.tweens.add({ targets: this.gameOverText, alpha: 1, duration: 500, ease: 'Linear' });

    const piesToAnimate = this.group.getChildren().slice();
    let animationsRemaining = piesToAnimate.length;

    const centerX = +this.game.config.width / 2;
    const centerY = +this.game.config.height / 2; // Or center of play area

    // Function to call when all animations finish
    const onAllAnimationsComplete = () => {
        if (animationsRemaining === 0) {
            this._showFinalScoreAndButton();
        }
    };

    // --- Start NEW Animation Logic ---
    piesToAnimate.forEach((pieObject) => {
        if (!(pieObject instanceof Phaser.Physics.Matter.Image) || !pieObject.body) {
            animationsRemaining--; // Decrement if object invalid at start
            onAllAnimationsComplete(); // Check completion immediately
            return;
        }

        const matterPieObject = pieObject as Phaser.Physics.Matter.Image;
        matterPieObject.setStatic(true); // Disable physics

        // Inhale Tween
        const inhaleTween = this.tweens.add({
            targets: matterPieObject,
            scale: matterPieObject.scale * 0.8, // Shrink a bit
            x: matterPieObject.x + (centerX - matterPieObject.x) * 0.1, // Move slightly towards center X
            y: matterPieObject.y + (centerY - matterPieObject.y) * 0.1, // Move slightly towards center Y
            duration: 300, // Short duration
            ease: 'Quad.easeOut',
            onComplete: () => {
                // Ensure object and body still valid before starting explode
                if (!matterPieObject || !matterPieObject.body) {
                    animationsRemaining--;
                    onAllAnimationsComplete();
                    return;
                }

                // Explode Tween
                const targetX = matterPieObject.x + Phaser.Math.RND.between(-1500, 1500); // Fly further out
                const targetY = matterPieObject.y + Phaser.Math.RND.between(-1500, 1500);
                
                const explodeTween = this.tweens.add({
                    targets: matterPieObject,
                    x: targetX,
                    y: targetY,
                    angle: Phaser.Math.RND.between(-1080, 1080), // More spin
                    duration: Phaser.Math.RND.between(400, 800), // Faster pop
                    ease: 'Expo.easeOut', // Fast exit
                    onComplete: () => {
                        // Stop tween explicitly before destroy
                        if (explodeTween && explodeTween.isPlaying()) { explodeTween.stop(); }
                        // Check body exists, remove from world, then destroy GameObject
                        if (matterPieObject.active && matterPieObject.body) { 
                           this.matter.world.remove(matterPieObject.body); // Remove body from Matter world
                           matterPieObject.destroy(); // Destroy the GameObject
                        }
                        animationsRemaining--;
                        onAllAnimationsComplete(); // Check if all done
                    }
                });
                // Ensure inhale tween stops if object destroyed prematurely
                 matterPieObject.once('destroy', () => { if (explodeTween && explodeTween.isPlaying()) { explodeTween.stop(); } });
            }
        });
         // Ensure inhale tween stops if object destroyed prematurely
        matterPieObject.once('destroy', () => { if (inhaleTween && inhaleTween.isPlaying()) { inhaleTween.stop(); } });
    });
    // --- End NEW Animation Logic ---

    // --- Start OLD Popping Logic (Commented Out) ---
    /*
    const piesToPop = this.group.getChildren().slice();
    Phaser.Utils.Array.Shuffle(piesToPop);
    const popDelay = 50; // Consider constant
    let totalDelay = 500; // Start after text fade
    const basePopScore = 5; // Consider constant

    piesToPop.forEach((pieObject, index) => {
      if (pieObject instanceof Phaser.Physics.Matter.Image) {
        this.time.addEvent({
          delay: totalDelay + index * popDelay,
          callback: () => {
            if (!pieObject || !this.group.contains(pieObject as Phaser.Physics.Matter.Image)) return;
            const matterPieObject = pieObject as Phaser.Physics.Matter.Image;
            if (!matterPieObject.active || !matterPieObject.body) return;

            const currentAngle = matterPieObject.angle;
            this.score += basePopScore;
            this.drawScore();
            if (!matterPieObject.body) return; // Final check
            matterPieObject.setStatic(true);

            const popTween = this.tweens.add({
              targets: matterPieObject, scale: 0, angle: currentAngle + 180, duration: 200, ease: 'Sine.easeInOut',
              onComplete: () => {
                // Explicitly stop the tween first
                if (popTween && popTween.isPlaying()) { 
                   popTween.stop(); 
                }
                // Now safely remove/destroy
                if (matterPieObject.active && this.group.contains(matterPieObject)) {
                  this.group.remove(matterPieObject, true, true);
                }
                // Check if last pie popped
                if (index === piesToPop.length - 1) {
                  this._showFinalScoreAndButton(); // Call helper
                }
              }
            });
            matterPieObject.once('destroy', () => { if (popTween && popTween.isPlaying()) { popTween.stop(); } });
          }
        });
        }
    });
    */
    // --- End OLD Popping Logic ---

    // Handle case where there were no pies to animate
    if (animationsRemaining === 0) {
       this.time.delayedCall(500, onAllAnimationsComplete, [], this); // Show UI after a small delay if no pies
    }
  }

  // --- Private Helper Methods ---

  private _createUIElements() {
    // Dropper (initially hidden and using placeholder texture)
    this.dropper = this.add.image(+this.game.config.width / 2, 100, 'pie_atlas', pies[0].assetKey)
        .setVisible(false)
        .setDepth(5); 

    // Boundary Lines (We'll disable drawing later)
    this.boundsGraphics = this.add.graphics();
    // this._redrawBoundaries(); // Don't draw initially

    // Score Text (Add padding since WALL_OFFSET is 0)
    const padding = 10;
    this.scoreText = this.add.text(padding, 100, '0', this.SCORE_TEXT_STYLE) // Use padding instead of WALL_OFFSET
        .setOrigin(0, 0.5).setDepth(10);

    // --- NEW Ceiling Bar --- 
    this.ceilingBarGraphics = this.add.graphics({ x: 0, y: this.CEILING_Y - 2.5 }); // Start at x=0
    this.ceilingBarGraphics.setDepth(10); 

    // --- NEW Ceiling Counter --- 
    const counterX = +this.game.config.width - this.COUNTER_CIRCLE_RADIUS - padding; // Use padding
    const counterY = this.CEILING_Y - 30; 
    // Background Circle
    this.ceilingCounterBg = this.add.graphics({ x: counterX, y: counterY });
    this.ceilingCounterBg.setDepth(10);
    // Counter Text
    this.ceilingCounterText = this.add.text(counterX, counterY, '0', this.COUNTER_TEXT_STYLE)
        .setOrigin(0.5).setDepth(11); // Slightly above background
    // Initial colors set in _initializeGaugeState

    // Game Over Text (Hidden)
    this.gameOverText = this.add.text(
        +this.game.config.width / 2, +this.game.config.height / 2 - 100, "GAME OVER", this.GAME_OVER_TEXT_STYLE
    ).setOrigin(0.5).setDepth(20).setAlpha(0);

    // Final Score Text (Hidden)
    this.finalScoreText = this.add.text(
        +this.game.config.width / 2, +this.game.config.height / 2, "Final Score: 0", this.FINAL_SCORE_TEXT_STYLE
    ).setOrigin(0.5).setDepth(20).setAlpha(0);

    // Play Again Button (Hidden)
    const buttonPadding = 15;
    const buttonText = this.add.text(0, 0, "PLAY AGAIN", this.PLAY_AGAIN_BUTTON_TEXT_STYLE).setOrigin(0.5);
    const buttonWidth = buttonText.width + buttonPadding * 2;
    const buttonHeight = buttonText.height + buttonPadding * 2;
    const buttonGraphics = this.add.graphics();
    buttonGraphics.fillStyle(0x555555, 0.8);
    buttonGraphics.lineStyle(3, 0xffffff, 1);
    buttonGraphics.fillRoundedRect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight, 10);
    buttonGraphics.strokeRoundedRect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight, 10);
    this.playAgainButtonContainer = this.add.container(
      +this.game.config.width / 2, +this.game.config.height / 2 + 100, [buttonGraphics, buttonText]
    )
    .setSize(buttonWidth, buttonHeight)
    .setInteractive({ useHandCursor: true })
    .on("pointerdown", () => { window.location.reload(); })
    .setVisible(false)
    .setDepth(20);

    // Lights (Consider moving to a separate UI/Effects manager)
    this.lights.enable().setAmbientColor(0xdddddd);
    this.lights.addLight(0, 0, 1000, 0x99ffff, 0.75).setScrollFactor(0);
  }

  private _createGameObjectPools() {
      // Flash Effect Pool
      this.flashPool = this.add.group({
          classType: Phaser.GameObjects.Arc,
          maxSize: 10,
          runChildUpdate: false
      });
      for (let i = 0; i < 5; i++) {
          const flash = this.add.circle(0, 0, 10, 0xffffff, 0.8).setActive(false).setVisible(false);
          this.flashPool.add(flash, true);
      }

      // Pie Fragment Particle Pool
      this.pieFragmentPool = this.add.group({
          // Use Image class, as fragments use pie textures
          classType: Phaser.GameObjects.Image, 
          maxSize: 30, // Max particles needed (e.g., 3 + largest pie index)
          runChildUpdate: false // No automatic update needed
      });
      for (let i = 0; i < 30; i++) {
          // Create inactive placeholder images with a default texture
          const fragment = this.add.image(0, 0, 'pie_atlas', pies[0].assetKey)
            .setActive(false)
            .setVisible(false)
            .setDepth(10); // Ensure particles are above merged pies
          this.pieFragmentPool.add(fragment, true); // Add inactive to pool
      }
  }

  private _handlePointerUp(pointer: Phaser.Input.Pointer) {
      // Resume Audio Context
      if (this.sound instanceof Phaser.Sound.WebAudioSoundManager && this.sound.context.state === 'suspended') {
        console.log("Attempting to resume AudioContext...");
        this.sound.context.resume().then(() => {
            console.log("AudioContext Resumed Successfully!");
        }).catch(e => {
            console.error("AudioContext Resume Failed:", e);
        });
      }

      // Input validation
      if (pointer.y < this.CEILING_Y || !this.dropper.visible || this.isGameOver || this.isDropping) {
        return;
      }

      this.isDropping = true;

      // Calculate clamped X position
      const targetX = pointer.x;
      const dropperRadius = this.dropper.displayWidth / 2;
      let clampedX = Phaser.Math.Clamp(targetX, dropperRadius + this.WALL_OFFSET, +this.game.config.width - dropperRadius - this.WALL_OFFSET);

      // Animate dropper horizontally, then drop
      this.tweens.add({
        targets: this.dropper,
        x: clampedX,
        duration: 150, // Consider constant
        ease: 'Quad.Out',
        onComplete: () => {
            this.dropper.setVisible(false);
            const currentPie = pies.find((pie) => pie.name === this.dropper.name)!;
            const gameObject = this.addPie(clampedX, this.CEILING_Y + 5, currentPie);
            gameObject.setData('isNew', true);
            gameObject.setData('initialY', this.CEILING_Y + 5);
            this.group.add(gameObject);

            // --- Check if dropped pie needs announcement (Indices 0-3 only) ---
            const droppedPieIndex = pies.findIndex(p => p.name === currentPie.name);
            const MAX_ANNOUNCE_INDEX = 3;
            if (droppedPieIndex <= MAX_ANNOUNCE_INDEX && !this.announcedPieIndices.has(droppedPieIndex)) {
                this.announcedPieIndices.add(droppedPieIndex);
                this.announceNewPie(currentPie); 
            }
            // --- End Dropped Pie Announcement Check ---

            // Select next pie and update dropper
            this._selectAndUpdateNextDropperPie();
            this.isDropping = false;

            // --- Increment drop counter & check for unlocking --- 
            this.dropsSinceMediumPieUnlock++;
            // Check if enough drops have passed AND if there's a higher pie created waiting to be unlocked
            if (this.dropsSinceMediumPieUnlock >= this.DROPS_TO_UNLOCK_NEXT_PIE && this.highestPieCreatedIndex > this.maxDroppablePieIndex) {
                // Unlock all pies up to the highest created (capped at 9 - Oreo Pie)
                this.maxDroppablePieIndex = Math.min(this.highestPieCreatedIndex, this.MAX_DROPPABLE_PIE_INDEX);
                console.log(`Unlocked pies up to index: ${this.maxDroppablePieIndex}`);
                // Reset the counter AFTER unlocking
                this.dropsSinceMediumPieUnlock = 0;
            }
        }
      });
  }

  private _selectAndUpdateNextDropperPie() {
      // --- NEW SEQUENTIAL LOGIC --- 
      const nextPieIndex = this.nextSequentialDropIndex;
      const nextPie = pies[nextPieIndex];
      this.updatePieDropper(nextPie); 

      // Increment and loop sequential index
      this.nextSequentialDropIndex++;
      if (this.nextSequentialDropIndex > this.maxDroppablePieIndex) {
          this.nextSequentialDropIndex = 0; // Loop back
      }
  }

  private _handleCollisionActive(event: Phaser.Physics.Matter.Events.CollisionActiveEvent) {
      const currentTime = this.time.now;
      for (const pair of event.pairs) {
          let pieBody: MatterJS.BodyType | null = null;
          if (pair.bodyA === this.ceilingSensorBody && pair.bodyB.gameObject instanceof Phaser.Physics.Matter.Image) {
              pieBody = pair.bodyB;
          } else if (pair.bodyB === this.ceilingSensorBody && pair.bodyA.gameObject instanceof Phaser.Physics.Matter.Image) {
              pieBody = pair.bodyA;
          }
          // If a valid pie is touching and NOT already tracked, add it with the current time
          if (pieBody && pieBody.gameObject && this.group.contains(pieBody.gameObject as Phaser.GameObjects.GameObject)) {
              if (!this._ceilingTouchTimers.has(pieBody.id)) {
                  this._ceilingTouchTimers.set(pieBody.id, currentTime);
              }
          }
      }
  }

  private _handleCollisionStart(event: Phaser.Physics.Matter.Events.CollisionStartEvent) {
        for (const pair of event.pairs) {
          const bodyA = pair.bodyA as MatterJS.BodyType;
          const bodyB = pair.bodyB as MatterJS.BodyType;
          const gameObjectA = bodyA.gameObject;
          const gameObjectB = bodyB.gameObject;

          if (!gameObjectA || !gameObjectB) continue; // Skip if not two game objects

          if (gameObjectA instanceof Phaser.GameObjects.Image && gameObjectB instanceof Phaser.GameObjects.Image) {
              const isANew = gameObjectA.getData('isNew') === true;
              const isBNew = gameObjectB.getData('isNew') === true;

              // Play squish sound on first contact if one is new
              if (isANew !== isBNew) { 
                  // this.sound.play('squish', { volume: 0.5 }); // DISABLED temporarily
                  // Restore original location of setData call:
                  let newPieObject = isANew ? gameObjectA : gameObjectB;
                  if (newPieObject) { newPieObject.setData('isNew', false); }
              }

              // RE-ENABLING MERGING
              if (gameObjectA.name === gameObjectB.name &&
                  this.group.contains(gameObjectA) && this.group.contains(gameObjectB) &&
                  !gameObjectA.getData('isMerging') && !gameObjectB.getData('isMerging')
                 )
              {
                  const pieIndex = pies.findIndex((pie) => pie.name === gameObjectA.name);
                  gameObjectA.setData('isMerging', true);
                  gameObjectB.setData('isMerging', true);

                  // --- MERGE LOGIC MODIFIED --- 
                  // Check if pieIndex is less than the absolute last mergeable index (17 for Pizza)
                  // pies.length is 19, so pies.length - 2 is the index of the last merge *result* (Pizza = 18)
                  // Therefore, the last *source* pie index that can merge is 17 (Raspberry Pie Big)
                  if (pieIndex <= 17) { // Check if the CURRENT pie index is mergeable
                      const nextPie = pies[pieIndex + 1];
                      const soundKey = 'pop'; // Restore pop sound
                      // Calculate detune based on pie size (index 0 = lowest pitch, index max = highest)
                      const maxDetune = 600; // Max detune in cents (+/- 6 semitones)
                      // Avoid division by zero if pies.length is 1 or 2
                      const denominator = pies.length > 2 ? pies.length - 2 : 1;
                      const progress = pieIndex / denominator; // 0 to 1 based on index
                      const detuneValue = -maxDetune + (progress * maxDetune * 2); // Linear pitch shift: low -> high

                      // Restore original pitch-shifted pop sound
                      this.sound.play(soundKey, { 
                          volume: 0.5,
                          detune: Math.round(detuneValue) // Restore detune
                      });

              this.animateMerge(
                          gameObjectA as Phaser.Physics.Matter.Image,
                  gameObjectB as Phaser.Physics.Matter.Image,
                          nextPie, pieIndex
              );
                  } else { // Merging largest pies (no sound needed as they just disappear)
               this.group.remove(gameObjectA, true, true);
               this.group.remove(gameObjectB, true, true);
                  }
              }
          }
      }
  }

  private _handleCollisionEnd(event: Phaser.Physics.Matter.Events.CollisionEndEvent) {
      for (const pair of event.pairs) {
          let pieBodyId: number | null = null;
          // Check if either body involved was the sensor and the other potentially a pie
          if (pair.bodyA === this.ceilingSensorBody && pair.bodyB.gameObject instanceof Phaser.Physics.Matter.Image) {
              pieBodyId = pair.bodyB.id;
          } else if (pair.bodyB === this.ceilingSensorBody && pair.bodyA.gameObject instanceof Phaser.Physics.Matter.Image) {
              pieBodyId = pair.bodyA.id;
          }
          // If a tracked pie stopped touching the sensor, remove it from the timer map
          if (pieBodyId !== null && this._ceilingTouchTimers.has(pieBodyId)) {
              this._ceilingTouchTimers.delete(pieBodyId);
          }
      }
  }

  private _initializeDropperState() {
    // --- NEW INITIALIZATION using sequential drop --- 
    this.nextSequentialDropIndex = 0; // Start sequence at 0
    this.updatePieDropper(pies[this.nextSequentialDropIndex]);
    // Increment for the *next* drop after this initial one
    this.nextSequentialDropIndex++; 

    // Dropper glow effect
    const glow = this.dropper.postFX.addGlow(0x99ddff);
    this.tweens.addCounter({
      yoyo: true, repeat: -1, from: 1, to: 3, duration: 1000,
      onUpdate: (tween) => { glow.outerStrength = tween.getValue(); },
    });
  }

  private _initializeGaugeState() { // Rename this method
    // Initial score draw is needed after scoreText is created
    this.drawScore();
    // Reset displayed count
    this._currentDisplayedCeilingCount = 0;
    // Initialize ceiling bar (inactive/green)
    this.ceilingBarGraphics.clear();
    this.ceilingBarGraphics.fillStyle(this.COLOR_GREEN, 1);
    const barWidth = +this.game.config.width; // Explicitly use full width
    const barHeight = 5;
    this.ceilingBarGraphics.fillRect(0, 0, barWidth, barHeight);
    // Initialize counter (inactive/green)
    this.ceilingCounterText.setText('0');
    this.ceilingCounterBg.clear();
    this.ceilingCounterBg.fillStyle(this.COLOR_GREEN, 1);
    this.ceilingCounterBg.fillCircle(0, 0, this.COUNTER_CIRCLE_RADIUS);
  }

  private _updateUIIndicators() {
      const currentTime = this.time.now;
      let stableTouchCount = 0;
      // REMOVED previous count check, not needed for range/rate-limit logic

      // Count pies touching for the required duration
      for (const touchStartTime of this._ceilingTouchTimers.values()) {
           if (currentTime - touchStartTime >= this.STABLE_TOUCH_DURATION) {
              stableTouchCount++;
           }
      }

      // Directly update the displayed count to match the current stable count
      this._currentDisplayedCeilingCount = stableTouchCount;

      // --- Update UI Colors Based on Count ---
      // Clamp count between 0 and 9 for color indexing
      const colorIndex = Phaser.Math.Clamp(this._currentDisplayedCeilingCount, 0, 9);
      const indicatorColor = this.INDICATOR_COLORS[colorIndex];

      // Update Ceiling Bar color
      this.ceilingBarGraphics.clear();
      this.ceilingBarGraphics.fillStyle(indicatorColor, 1); // Use selected color
      const barWidth = +this.game.config.width; // Explicitly use full width
      const barHeight = 5;
      this.ceilingBarGraphics.fillRect(0, 0, barWidth, barHeight);

      // Update Counter Text using the stable count
      this.ceilingCounterText.setText(this._currentDisplayedCeilingCount.toString());

      // Update Counter Background color
      this.ceilingCounterBg.clear();
      this.ceilingCounterBg.fillStyle(indicatorColor, 1); // Use selected color
      this.ceilingCounterBg.fillCircle(0, 0, this.COUNTER_CIRCLE_RADIUS);
      // --- End UI Color Update ---

      // --- Sound Playback Logic --- 
      const currentTouchCount = this._currentDisplayedCeilingCount;
      const previousTouchCount = this._previousCeilingTouchCount;

      // --- Squeak Sound Logic (Threshold Crossing & Rate Limiting) --- 
      // Check for squeak3 threshold (8+)
      if (currentTouchCount >= 8 && previousTouchCount < 8) {
          const lastPlayTime = this._lastStrainSoundPlayTime['squeak3'] || 0;
          if (currentTime - lastPlayTime > this.STRAIN_SOUND_INTERVAL) {
              this.sound.play('squeak3', { volume: 0.8 });
              this._lastStrainSoundPlayTime['squeak3'] = currentTime;
          }
      }
      // Check for squeak2 threshold (5-7) only if squeak3 didn't trigger
      else if (currentTouchCount >= 5 && previousTouchCount < 5) {
          const lastPlayTime = this._lastStrainSoundPlayTime['squeak2'] || 0;
          if (currentTime - lastPlayTime > this.STRAIN_SOUND_INTERVAL) {
              this.sound.play('squeak2', { volume: 0.6 });
              this._lastStrainSoundPlayTime['squeak2'] = currentTime;
          }
      }
      // Check for squeak1 threshold (2-4) only if squeak2/3 didn't trigger
      else if (currentTouchCount >= 2 && previousTouchCount < 2) {
          const lastPlayTime = this._lastStrainSoundPlayTime['squeak1'] || 0;
          if (currentTime - lastPlayTime > this.STRAIN_SOUND_INTERVAL) {
              this.sound.play('squeak1', { volume: 0.4 });
              this._lastStrainSoundPlayTime['squeak1'] = currentTime;
          }
      }
      
      // --- Sigh Sound Logic (Updated) --- 
      // Set flag if threshold is reached
      if (currentTouchCount >= 2) { 
          this._hasReachedSighThreshold = true;
          this._timeAtZeroStart = null; // Reset timer if count goes up
      }

      // Check if count is low (1 or 0) and threshold was met
      if (currentTouchCount <= 1 && this._hasReachedSighThreshold) { // CHANGED condition to <= 1
          // Start timer if it hasn't started
          if (this._timeAtZeroStart === null) {
              this._timeAtZeroStart = currentTime;
          }
          // Check if enough time at low count has passed
          if (currentTime - (this._timeAtZeroStart || 0) >= this.STRAIN_SOUND_INTERVAL) { // Using 5 sec interval
              this.sound.play('sigh', { volume: 0.6 });
              this._hasReachedSighThreshold = false; // Reset flag after playing
              this._timeAtZeroStart = null; // Reset timer
          }
      } 
      // Reset timer if count goes above 1 before sigh plays
      else if (currentTouchCount > 1) { // CHANGED condition to > 1
          this._timeAtZeroStart = null;
      }
      // --- End Sigh Sound Logic --- 

      // Store current count for the next frame
      this._previousCeilingTouchCount = currentTouchCount;
      // --- End Sound Playback Logic ---
  }

  private _checkGameOverCondition() {
      // Game over check now uses the stable displayed count
      if (this._currentDisplayedCeilingCount >= this.MAX_CEILING_TOUCHES) {
          console.log(`Game Over: Stable ceiling touch count reached ${this._currentDisplayedCeilingCount}`);
          this.triggerGameOver();
      }
  }

  private _checkAndAnnounceNewPie(pie: Pie, pieIndex: number) {
      // const MAX_ANNOUNCE_INDEX = 3; // REMOVED index limit

      // Announce if this pie index hasn't been announced yet
      // if (pieIndex <= MAX_ANNOUNCE_INDEX && !this.announcedPieIndices.has(pieIndex)) { // Old check
      if (!this.announcedPieIndices.has(pieIndex)) { // NEW check: Announce any pie first time
          this.announcedPieIndices.add(pieIndex);
          this.announceNewPie(pie); 
      }

      // Always add the index of the *created* pie to droppable (if not already there)
      // This allows pies > 3 to become droppable after being merged
      if (!this.droppablePieIndices.includes(pieIndex)) {
          this.droppablePieIndices.push(pieIndex);
          // Optional: Sort if you want droppable list ordered (might not be necessary)
          // this.droppablePieIndices.sort((a, b) => a - b);
      }
  }

    private _showFinalScoreAndButton() {
            this.finalScoreText.setText(`Final Score: ${this.score}`);
        // Fade in score and button
        this.tweens.add({ targets: this.finalScoreText, alpha: 1, duration: 300 });
            this.playAgainButtonContainer.setVisible(true);
        this.tweens.add({ targets: this.playAgainButtonContainer, alpha: 1, duration: 300 });
    }

  private _handleResize() {
      const camera = this.cameras.main;
      
      // Position Score Text (Use padding)
      if (this.scoreText) {
         const scorePaddingLeft = 10;
         const scoreY = this.CEILING_Y - 30; 
         this.scoreText.setPosition(
            camera.worldView.x + scorePaddingLeft, // Use padding instead of WALL_OFFSET
            scoreY
         );
      }
      // TODO: Add repositioning for ceiling counter and bar if needed on resize
  }

  // ADDED: Method to initialize and start the main game
  private _startGame() {
    // Prevent starting multiple times
    if (this.isGameActive || this.isInMenu) return; // ADDED isInMenu check

    // 1. Enable Physics and let Title Elements Fall
    const elementsToDrop = [this.titleLogo, this.titlePlayButton, this.titleMenuButton];
    elementsToDrop.forEach(element => {
        if (element) {
            // Convert the regular image to a Matter physics body
            this.matter.add.gameObject(element, {
                // Optional: Adjust physics properties if needed
                // friction: 0.1,
                // bounce: 0.2,
            }); 
            // Ensure it's treated as a rectangle for collision/physics shape
            if (element.body) { // Check if body was created successfully
               (element as Phaser.Physics.Matter.Image).setRectangle(element.displayWidth, element.displayHeight);
               // MAKE IT A SENSOR TO IGNORE FLOOR COLLISION
               (element as Phaser.Physics.Matter.Image).setSensor(true);
            }
            // Optionally give a slight push
            // (element as Phaser.Physics.Matter.Image).setVelocityY(5);
        }
    });

    // 2. Setup Main Game (with a slight delay)
    this.time.delayedCall(200, () => { 
        // Now just calls the setup helper
        this._setupGameplay();
    }); // End of delayed call
  }

  // ADDED: Helper method containing the core game setup logic
  private _setupGameplay() {
     // Matter world setup (Needs to exist before adding game objects)
      this.matter.world.setBounds(this.WALL_OFFSET, this.CEILING_Y, +this.game.config.width - (this.WALL_OFFSET * 2), this.FLOOR_Y - this.CEILING_Y); 
      this.matter.world.setGravity(0, 4); // Use game gravity

      // Create Pies Group
      this.group = this.add.group();

      // --- Create Ceiling Sensor ---
      const sensorY = this.CEILING_Y - 1;
      this.ceilingSensorBody = this.matter.add.rectangle(
        +this.game.config.width / 2,
        sensorY,
        +this.game.config.width - (this.WALL_OFFSET * 2), // Use new width & offset
        5, 
        { isStatic: true, isSensor: true, label: 'ceilingSensor' }
      );

      // --- Create UI Elements ---
      this._createUIElements();

      // --- ADD Top Logo --- 
      const topLogoX = +this.game.config.width / 2;
      const topLogoY = 0; // REVERTED: Start at the very top
      this.topLogo = this.add.image(topLogoX, topLogoY, 'toplogo')
          .setOrigin(0.5, 0) // REVERTED: Anchor top-center
          .setScale(0.60) 
          .setDepth(5); 

      // --- Create Object Pools ---
      this._createGameObjectPools();

      // --- Collision Handling ---
      this.matter.world.on('collisionstart', this._handleCollisionStart, this);
      this.matter.world.on('collisionactive', this._handleCollisionActive, this);
      this.matter.world.on('collisionend', this._handleCollisionEnd, this);

      // --- Initial Game State ---
      this._initializeDropperState();
      this._initializeGaugeState();

      // --- Resize Handling ---
      this._handleResize(); // Call once to position UI correctly

      // --- Set Game Active --- 
      this.isGameActive = true; // Allow update loop to run game logic
      this.isGameOver = false; // Ensure game over state is reset
  }

  // ADDED: Method to animate exit from menu and start game
  private _exitMenuAndStartGame() {
      // Prevent running if not in menu or game already active
      if (!this.isInMenu || this.isGameActive) return;
      this.isInMenu = false; // Clear menu flag

      const camera = this.cameras.main;
      const screenBottom = camera.displayHeight + 100; // Target Y below screen
      const animationDuration = 500;

      // Animate menu elements off screen
      this.tweens.add({
          targets: [this.menuBackground, this.titleMenuButton, this.titlePlayButton],
          y: screenBottom,
          duration: animationDuration,
          ease: 'Cubic.In',
          onComplete: () => {
              // Destroy menu elements
              this.menuBackground?.destroy();
              this.titleMenuButton?.destroy();
              this.titlePlayButton?.destroy();
              // Destroy menu options
              this.muteToggleRect?.destroy();
              this.muteCheckmark?.destroy();
              this.restartButton?.destroy();
              this.leaderboardButton?.destroy();
              // Setup the game
              this._setupGameplay();
          }
      });
  }

  // ADDED: Method to animate transition to menu screen
  private _showMenuScreen() {
    // Prevent running if already in menu or game started
    if (this.isGameActive || this.isInMenu) return;
    this.isInMenu = true; // Set menu flag

    const screenTop = -this.titleLogo.displayHeight; // Target Y above screen
    const camera = this.cameras.main; // Get camera reference
    const menuButtonTargetY = camera.worldView.y + (this.titleMenuButton.displayHeight * this.titleMenuButton.scaleY / 2) + 60; // Increased padding to 60px from top
    const animationDuration = 500; // ms

    // 1. Animate Logo and Play Button Upwards
    this.tweens.add({
        targets: [this.titleLogo, this.titlePlayButton],
        y: screenTop,
        duration: animationDuration,
        ease: 'Cubic.In', // Ease in for upward movement
        onComplete: () => {
            // After moving off-screen, reposition Play button below screen
            const playButtonFinalY = this.menuBackground.y + (this.menuBackground.displayHeight / 2) - (this.titlePlayButton.displayHeight * this.titlePlayButton.scaleY / 2)+10; // Position slightly above bottom edge of menu BG
            this.titlePlayButton.y = camera.displayHeight + this.titlePlayButton.displayHeight; // Move below screen
            
            // Animate Play button back up
            this.tweens.add({
                targets: this.titlePlayButton,
                y: playButtonFinalY,
                alpha: 1, // Ensure it's visible
                duration: animationDuration * 0.8, 
                ease: 'Cubic.Out',
                onComplete: () => {
                    // Remove previous listener (if any)
                    this.titlePlayButton.off('pointerdown'); 
                    // Add new listener to exit menu
                    this.titlePlayButton.on('pointerdown', () => {
                        this._exitMenuAndStartGame();
                    });
                }
            });
        }
    });

    // 2. Animate Menu Button to Top Position
    this.tweens.add({
        targets: this.titleMenuButton,
        y: menuButtonTargetY,
        duration: animationDuration,
        ease: 'Cubic.InOut' // Smooth transition
    });

    // 3. Create and Fade In Dark Background
    // Calculate position and size based on camera view for responsiveness
    const bgWidth = camera.displayWidth * 0.8; // 80% of screen width
    const bgHeight = camera.displayHeight * 0.75; // 60% of screen height
    const bgX = camera.centerX; // Center X
    const bgY = menuButtonTargetY + (bgHeight/2) +10; // Position slightly below center Y

    this.menuBackground = this.add.rectangle(bgX, bgY, bgWidth, bgHeight, 0x000000, 0.7)
        .setOrigin(0.5)
        .setAlpha(0) // Start transparent
        .setDepth(90); // Below menu button but above title elements

    this.tweens.add({
        targets: this.menuBackground,
        alpha: 0.7, // Fade in to target alpha
        duration: animationDuration,
        delay: animationDuration * 0.5, 
        ease: 'Linear',
        onComplete: () => {
            console.log("Menu screen ready");
            
            // --- Add Menu Options --- 
            const menuCenterX = this.menuBackground.x;
            const menuTopY = this.menuBackground.y - (this.menuBackground.displayHeight / 2);
            const itemPadding = 100; // INCREASED vertical padding further
            const initialTopOffset = 90; // Start first item lower
            const toggleSize = 30; 
            const itemDepth = 91; // Depth for items above background

            // Mute Option
            const muteY = menuTopY + initialTopOffset; // New Y based on offset
            this.add.text(menuCenterX - (toggleSize / 2) - 10, muteY, "Mute", this.MENU_ITEM_STYLE)
                .setOrigin(1, 0.5) // Align text right edge to left of toggle center
                .setDepth(itemDepth); // Set depth
            this.muteToggleRect = this.add.rectangle(menuCenterX, muteY, toggleSize, toggleSize, 0xffffff)
                .setOrigin(0.5) // Center the toggle box
                .setStrokeStyle(2, 0xaaaaaa)
                .setInteractive({ useHandCursor: true })
                .setDepth(itemDepth); // Set depth
            // Add checkmark graphics inside toggle
            this.muteCheckmark = this.add.graphics({ x: menuCenterX, y: muteY })
                .setDepth(itemDepth + 1); // Ensure checkmark is above toggle box
            this.muteCheckmark.lineStyle(4, 0x00ff00).strokePoints([{x: -8, y: 0}, {x: 0, y: 8}, {x: 8, y: -8}]);
            this.muteCheckmark.setVisible(!this.sound.mute);
            // Mute Toggle Listener
            this.muteToggleRect.on('pointerdown', () => {
                this.sound.mute = !this.sound.mute;
                this.muteCheckmark.setVisible(!this.sound.mute);
            });

            // Restart Option
            const restartY = muteY + itemPadding; // New Y calc
            this.restartButton = this.add.text(menuCenterX, restartY, "Restart Game", this.MENU_ITEM_STYLE)
                .setOrigin(0.5)
                .setInteractive({ useHandCursor: true })
                .setDepth(itemDepth); // Set depth
            this.restartButton.on('pointerdown', () => {
                this.scene.restart(); // Simple restart for now
            });

            // Leaderboard Option (Placeholder)
            const leaderboardY = restartY + itemPadding; // New Y calc
            this.leaderboardButton = this.add.text(menuCenterX, leaderboardY, "Leaderboard", this.MENU_ITEM_STYLE)
                .setOrigin(0.5)
                .setInteractive({ useHandCursor: true })
                .setDepth(itemDepth); // Set depth
             this.leaderboardButton.on('pointerdown', () => {
                 console.log("Leaderboard clicked (not implemented)");
                 // TODO: Implement leaderboard scene/modal
             });
            // --- End Menu Options ---
        }
    });
  }

} // End of Main Scene

// Phaser game configuration
const config: Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 560, // NEW NARROWER WIDTH
  height: 1000,
  parent: "app",     
  transparent: true, // Make canvas transparent to see CSS background
  physics: {
    default: "matter",
    matter: {
      gravity: { x: 0, y: 4 }, // Slightly higher gravity
      debug: false,
    },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH, 
    width: 560, // NEW NARROWER WIDTH
    height: 1000,
  },
  scene: Main, 
};

new Phaser.Game(config);

// Ensure CSS is imported (usually only needed once)
// import './style.css'; 