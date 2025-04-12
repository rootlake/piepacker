import "./style.css";

// Add specific Phaser imports for clarity and type checking
import Phaser, { Types } from 'phaser';
// import { experimentalPhysics } from './physics'; // Remove incorrect import
import { announcementTemplates } from './announcements'; // Import the templates
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
  private readonly CEILING_Y = 150;
  private readonly FLOOR_Y = 900;
  private readonly WALL_OFFSET = 65;
  private readonly MAX_CEILING_TOUCHES = 10; // Reverted back (was 3 for testing)
  private readonly INITIAL_DROPPER_RANGE_MAX_INDEX = 7;
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
  private readonly ANNOUNCEMENT_TEXT_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: 'sans-serif',
      fontSize: '40px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
      align: 'center'
  };
  private readonly COUNTER_TEXT_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: 'sans-serif',
      fontSize: '56px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3
  };
  private readonly COUNTER_CIRCLE_RADIUS = 30;
  private readonly COLOR_GREEN = 0x00ff00;
  private readonly INDICATOR_COLORS = [
    0x3EB24A, 0x7CC242, 0x9DCB3B, 0xC4D92E, 0xE7E621, 
    0xF5EB02, 0xF5C913, 0xF6951E, 0xF15B22, 0xE92A28
  ];
  private readonly STABLE_TOUCH_DURATION = 250; // ms duration for a touch to count
  private readonly STRAIN_SOUND_INTERVAL = 5000; // Minimum ms between strain sounds
  private readonly SIGH_DELAY_MS = 3000; // Minimum ms at zero before sigh plays

  // --- State & Game Objects ---
  score = 0;
  dropper!: Phaser.GameObjects.Image;
  group!: Phaser.GameObjects.Group;
  isGameOver = false;
  scoreText!: Phaser.GameObjects.Text;
  isDropping = false;
  announcedPieIndices: Set<number> = new Set();
  isAnnouncing = false;
  availableTemplates: string[] = [];
  flashPool!: Phaser.GameObjects.Group;
  gameOverText!: Phaser.GameObjects.Text;
  playAgainButtonContainer!: Phaser.GameObjects.Container;
  finalScoreText!: Phaser.GameObjects.Text;
  muteButtonContainer!: Phaser.GameObjects.Container; // Keep commented out usage later
  restartButtonContainer!: Phaser.GameObjects.Container; // Keep commented out usage later
  droppablePieIndices: number[] = [0, 1, 2, 3, 4, 5, 6, 7];
  ceilingBody!: MatterJS.BodyType;
  boundsGraphics!: Phaser.GameObjects.Graphics;
  ceilingSensorBody!: MatterJS.BodyType;
  _ceilingTouchTimers = new Map<number, number>(); // ADDED: bodyId -> touchStartTime
  ceilingBarGraphics!: Phaser.GameObjects.Graphics;
  ceilingCounterText!: Phaser.GameObjects.Text;
  ceilingCounterBg!: Phaser.GameObjects.Graphics;
  _currentDisplayedCeilingCount = 0;
  private _lastStrainSoundPlayTime: { [key: string]: number } = {}; // Timestamps for rate limiting
  private _hasReachedSighThreshold: boolean = false; // Added for sigh sound logic
  private _timeAtZeroStart: number | null = null; // Tracks when count first hit zero
  private _highWaterMarkCeilingTouchCount = 0; // Track highest touch count since last zero
  private _lastNonZeroTouchCount = 0; // Added: Track last count before becoming zero
  private _previousCeilingTouchCount = 0; // ADDED: Track count from previous frame for sound triggers
  // titleText!: Phaser.GameObjects.Text; // Title removed earlier

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
    // REMOVED other pop loads
    // this.load.audio('pop1', ['assets/sounds/pop1.ogg', 'assets/sounds/pop1.aac']);
    // this.load.audio('pop2', ['assets/sounds/pop2.ogg', 'assets/sounds/pop2.aac']);
    // this.load.audio('pop4', ['assets/sounds/pop4.ogg', 'assets/sounds/pop4.aac']);
    // this.load.audio('pop5', ['assets/sounds/pop5.ogg', 'assets/sounds/pop5.aac']);
    // this.load.audio('pop6', ['assets/sounds/pop6.ogg', 'assets/sounds/pop6.aac']);
  }

  create() {
    console.log("Running create...");

    // Matter world setup
    this.matter.world.setBounds(this.WALL_OFFSET, this.CEILING_Y, +this.game.config.width - (this.WALL_OFFSET * 2), this.FLOOR_Y - this.CEILING_Y); 
    this.matter.world.setGravity(0, 1.5);

    // Create Pies Group
    this.group = this.add.group();

    // --- Create Ceiling Sensor ---
    const sensorY = this.CEILING_Y - 1;
    this.ceilingSensorBody = this.matter.add.rectangle(
      +this.game.config.width / 2,
      sensorY,
      +this.game.config.width - (this.WALL_OFFSET * 2),
      5, // Small height for the sensor
      { isStatic: true, isSensor: true, label: 'ceilingSensor' }
    );

    // --- Create UI Elements ---
    this._createUIElements();

    // --- Create Object Pools ---
    this._createGameObjectPools();

    // --- Collision Handling ---
    this.matter.world.on('collisionstart', this._handleCollisionStart, this);
    // Add back listeners needed for ceiling sensor
    this.matter.world.on('collisionactive', this._handleCollisionActive, this);
    this.matter.world.on('collisionend', this._handleCollisionEnd, this);

    // --- Input Handling ---
    this.input.on('pointerup', this._handlePointerUp, this);

    // --- Initial Game State ---
    this._initializeDropperState();
    this._initializeGaugeState();

    // --- Resize Handling ---
    this.scale.on('resize', this._handleResize, this);
    this._handleResize();

    // --- Game Over State Reset ---
    this.isGameOver = false;
  }

  update(/* time: number, delta: number */) {
    if (!this.isGameOver) {
        this._updateUIIndicators();
        this._redrawBoundaries(); // Use correct method name
        this._checkGameOverCondition();
    }
  }

  // --- Core Gameplay Methods ---
  updatePieDropper(pie: Pie) {
    this.isDropping = true;

    const targetY = this.CEILING_Y - pie.radius - 10;
    const centerX = +this.game.config.width / 2;
    const startY = -pie.radius;

    this.dropper
      .setTexture('pie_atlas', pie.assetKey)
      .setName(pie.name)
      .setDisplaySize(pie.radius * 2, pie.radius * 2)
      .setY(startY)
      .setX(centerX)
      .setVisible(true);

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
    const popDuration = 100; // Consider constant
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
        const newGameObject = this.addPie(mergeX, mergeY, nextPie);
        const finalWidth = nextPie.radius * 2;
        const finalHeight = nextPie.radius * 2;
        newGameObject.setDisplaySize(finalWidth * 0.1, finalHeight * 0.1);
        this.group.add(newGameObject);

        // Pop animation for new pie
        this.tweens.add({
          targets: newGameObject,
          displayWidth: finalWidth,
          displayHeight: finalHeight,
          duration: popDuration,
          ease: 'Back.Out'
        });

        // Update score and announce
        this.score += (pieIndex + 1) * 10;
        this.drawScore();
        this._checkAndAnnounceNewPie(nextPie, pieIndex + 1);
      }
    };

    // Shrink/spin tweens for original pies
    tweenA = this.tweens.add({ targets: pieA, scale: 0, angle: pieA.angle + 360, x: mergeX, y: mergeY, duration: shrinkDuration, ease: 'Sine.InOut', onComplete: onTweenComplete });
    tweenB = this.tweens.add({ targets: pieB, scale: 0, angle: pieB.angle - 360, x: mergeX, y: mergeY, duration: shrinkDuration, ease: 'Sine.InOut', onComplete: onTweenComplete });

    // Stop tweens if objects destroyed prematurely (e.g., game over)
    pieA.once('destroy', () => { if (tweenA && tweenA.isPlaying()) { tweenA.stop(); } });
    pieB.once('destroy', () => { if (tweenB && tweenB.isPlaying()) { tweenB.stop(); } });
  }

  announceNewPie(pie: Pie, pieIndex: number) {
    if (this.isAnnouncing) return;
    this.isAnnouncing = true;

    // Select template
    if (this.availableTemplates.length === 0) {
        this.availableTemplates = [...announcementTemplates];
        Phaser.Utils.Array.Shuffle(this.availableTemplates);
    }
    const template = this.availableTemplates.pop() || "{PIE_NAME} UNLOCKED!";
    const announcementString = template.replace("{PIE_NAME}", pie.name.toUpperCase());

    // Calculate position
    const baseY = 200;
    const verticalStep = 10;
    const targetY = baseY + pieIndex * verticalStep;

    // Create text object
    const announcementText = this.add.text(
        +this.game.config.width / 2, targetY, announcementString, this.ANNOUNCEMENT_TEXT_STYLE
    ).setOrigin(0.5).setAlpha(0).setScale(0.5).setDepth(10)
     .setShadow(2, 2, '#000000', 2, true, true);

    // Word wrapping
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
                // Ensure tween stops if object destroyed prematurely
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

  private _initializeProperties() {
    // Initialize Phaser objects needed early
    this.dropper = this.add.image(+this.game.config.width / 2, 100, 'pie_atlas', pies[0].assetKey);
    this.group = this.add.group();

    // Initialize state
    this.isGameOver = false;
    this.isDropping = false;
    this.isAnnouncing = false;
    this.announcedPieIndices.clear();
    this.availableTemplates = [...announcementTemplates];
    Phaser.Utils.Array.Shuffle(this.availableTemplates);
    this.score = 0; // Reset score if restarting scene
    // Reset droppable pies if needed (depends on game design)
    // this.droppablePieIndices = [0, 1, 2, 3, 4, 5, 6, 7];
  }

  private _setupPhysics() {
    // Ceiling Body
    this.ceilingBody = this.matter.add.rectangle(
        +this.game.config.width / 2,
        this.CEILING_Y - 5,
        +this.game.config.width - (this.WALL_OFFSET * 2),
        10,
        { isStatic: true, label: 'ceiling' }
    );

    // Ceiling Sensor
    const sensorY = this.CEILING_Y - 1;
    this.ceilingSensorBody = this.matter.add.rectangle(
      +this.game.config.width / 2,
      sensorY,
      +this.game.config.width - (this.WALL_OFFSET * 2),
      5,
      { isStatic: true, isSensor: true, label: 'ceilingSensor' }
    );

    // World Bounds
    this.matter.world.setBounds(
      this.WALL_OFFSET,
      this.CEILING_Y,
      +this.game.config.width - (this.WALL_OFFSET * 2),
      this.FLOOR_Y - this.CEILING_Y,
      undefined, undefined, undefined, false, true
    );
  }

  private _createUIElements() {
    // Dropper (initially hidden and using placeholder texture)
    // We set the correct texture and position in _initializeDropperState
    this.dropper = this.add.image(+this.game.config.width / 2, 100, 'pie_atlas', pies[0].assetKey)
        .setVisible(false)
        .setDepth(5); 

    // Boundary Lines
    this.boundsGraphics = this.add.graphics();
    this._redrawBoundaries(); // Initial draw

    // Score Text
    this.scoreText = this.add.text(this.WALL_OFFSET + 10, 100, '0', this.SCORE_TEXT_STYLE)
        .setOrigin(0, 0.5).setDepth(10);

    // --- NEW Ceiling Bar --- 
    this.ceilingBarGraphics = this.add.graphics({ x: this.WALL_OFFSET, y: this.CEILING_Y - 2.5 }); // Positioned at ceiling line
    this.ceilingBarGraphics.setDepth(10); // Same depth as score
    // Initial draw will happen in _initializeGaugeState (renaming it soon)

    // --- NEW Ceiling Counter --- 
    const counterX = +this.game.config.width - this.WALL_OFFSET - this.COUNTER_CIRCLE_RADIUS - 10; // Position top-right (Restored)
    const counterY = this.CEILING_Y - 30; // Position slightly above ceiling line (Restored)
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
    this.lights.addLight(0, 0, 1000, 0x99ffff, 0.75).setScrollFactor(0); // Placeholder position
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
  }

  private _setupInputHandling() {
      this.input.on("pointerup", this._handlePointerUp, this);

      // Update light position with pointer move (example)
      this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
          const light = this.lights.lights[0]; // Assuming only one light
          if (light) {
              light.setPosition(pointer.x, pointer.y);
          }
      });
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

            // Select next pie and update dropper
            this._selectAndUpdateNextDropperPie();
            this.isDropping = false;
        }
      });
  }

  private _selectAndUpdateNextDropperPie() {
      // REMOVED TEMPORARY TESTING: Drop only large pies
      // const minDropIndex = 10; 
      // const maxDropIndex = pies.length - 1;
      // const nextPieIndex = Phaser.Math.RND.between(minDropIndex, maxDropIndex);
      // const nextPie = pies[nextPieIndex];
      // this.updatePieDropper(nextPie);
      // --- END TEMPORARY TESTING ---

      // Restore original random limited logic:
      const availableToDrop = this.droppablePieIndices.filter(index => index <= this.INITIAL_DROPPER_RANGE_MAX_INDEX);
      const nextPieIndex = Phaser.Math.RND.pick(availableToDrop);
      const nextPie = pies[nextPieIndex];
      this.updatePieDropper(nextPie);
  }

  private _setupCollisionListeners() {
      this.matter.world.on('collisionactive', this._handleCollisionActive, this);
      this.matter.world.on("collisionstart", this._handleCollisionStart, this);
      this.matter.world.on('collisionend', this._handleCollisionEnd, this); // ADDED listener
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

                  if (pieIndex < pies.length - 1) { // Not largest pie
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
    // REMOVED TEMPORARY TESTING: Drop only large pies initially too
    // const minDropIndex = 10; 
    // const maxDropIndex = pies.length - 1;
    // const initialPieIndex = Phaser.Math.RND.between(minDropIndex, maxDropIndex);
    // this.updatePieDropper(pies[initialPieIndex]);
    // --- END TEMPORARY TESTING ---

    // Restore original random limited logic:
    const initialDroppableRange = this.droppablePieIndices.filter(index => index <= this.INITIAL_DROPPER_RANGE_MAX_INDEX);
    this.updatePieDropper(pies[Phaser.Math.RND.pick(initialDroppableRange)]);

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
    const barWidth = (+this.game.config.width - this.WALL_OFFSET * 2);
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
      const barWidth = (+this.game.config.width - this.WALL_OFFSET * 2);
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

  private _redrawBoundaries() {
    // Redraws walls and floor - ceiling line handled by gauge
    this.boundsGraphics.clear();
    const rightWallX = +this.game.config.width - this.WALL_OFFSET;
    this.boundsGraphics.lineStyle(1, 0xffffff, 1);
    this.boundsGraphics.moveTo(this.WALL_OFFSET, this.CEILING_Y);
    this.boundsGraphics.lineTo(this.WALL_OFFSET, this.FLOOR_Y);
    this.boundsGraphics.moveTo(this.WALL_OFFSET, this.FLOOR_Y);
    this.boundsGraphics.lineTo(rightWallX, this.FLOOR_Y);
    this.boundsGraphics.moveTo(rightWallX, this.CEILING_Y);
    this.boundsGraphics.lineTo(rightWallX, this.FLOOR_Y);
    this.boundsGraphics.strokePath();
  }

  private _checkAndAnnounceNewPie(pie: Pie, pieIndex: number) {
      // Check if this pie type needs its announcement
      if (!this.announcedPieIndices.has(pieIndex)) {
          this.announcedPieIndices.add(pieIndex);
          this.announceNewPie(pie, pieIndex);
      }
      // Separately, check if it needs to be added to the droppable pool
      if (!this.droppablePieIndices.includes(pieIndex)) {
          this.droppablePieIndices.push(pieIndex);
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
      
      // Position Score Text
      if (this.scoreText) {
         const scorePaddingLeft = 10;
         const scoreY = this.CEILING_Y - 30; 
         this.scoreText.setPosition(
            camera.worldView.x + this.WALL_OFFSET + scorePaddingLeft, 
            scoreY
         );
      }
  }

  // Updated helper function to play strain sounds based on ranges with rate limiting
  private _playStrainSounds(currentCount: number) {
    const ranges = [
      { min: 2, max: 4, key: 'squeak1', volume: 0.4 },
      { min: 5, max: 7, key: 'squeak2', volume: 0.6 },
      { min: 8, max: 10, key: 'squeak3', volume: 0.8 }
    ];
    const currentTime = this.time.now;

    for (const range of ranges) {
        if (currentCount >= range.min && currentCount <= range.max) {
            const soundKey = range.key;
            const lastPlayTime = this._lastStrainSoundPlayTime[soundKey] || 0;

            // Check if interval has passed
            if (currentTime - lastPlayTime > this.STRAIN_SOUND_INTERVAL) {
                // console.log(`Playing strain sound: ${soundKey} for count ${currentCount}`);
                this.sound.play(soundKey, { volume: range.volume });
                this._lastStrainSoundPlayTime[soundKey] = currentTime; // Update last play time
            }
            // If count is in this range, don't check lower ranges
            break; 
        }
    }
  }

} // End of Main Scene

// Phaser game configuration
const config: Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 720,
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
    width: 720,
    height: 1000,
  },
  scene: Main,
};

new Phaser.Game(config);

// Ensure CSS is imported (usually only needed once)
// import './style.css'; 