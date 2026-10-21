"use client";

import type { CSSProperties } from "react";
import type { RoverFacing } from "./useRoverAnimation";

interface RoverModelProps {
  x: number;
  y: number;
  scale: number;
  facing: RoverFacing;
  isMoving: boolean;
  isDrilling: boolean;
}

/**
 * Ultra-realistic, high-fidelity Mars exploration rover (Perseverance / Curiosity class).
 * Renders distinct, perspective-accurate 3D-isometric models for all 4 cardinal directions:
 * - FRONT: Front 3/4 view with dual headlights casting volumetric light cones,
 *          stereo Hazcams, front bumper hazard stripes, Mastcam-Z tower with dual sapphire lenses,
 *          and front rocker-bogie steering wheels.
 * - BACK: Rear view featuring the Multi-Mission Radioisotope Thermoelectric Generator (MMRTG)
 *         with radial cooling fins and glowing thermal core, steerable High-Gain Antenna (HGA) dish,
 *         UHF antenna with strobe beacon, rear Hazcams, and sample cache bay.
 * - LEFT: Dynamic left profile showing the full 3-wheel Rocker-Bogie suspension system with
 *         titanium rocker arm, bogie pivot, chevron treads, left headlight, and left-angled Mastcam.
 * - RIGHT: Dynamic right profile showing the 3-wheel right Rocker-Bogie suspension, sample caching
 *          carousel, science calibration targets, right headlight, and right-angled Mastcam.
 *
 * Includes dynamic physics:
 * - Animated rotating wheel treads and dust trails when moving
 * - Articulated robotic arm, spinning coring drill, laser target, and spark particles when drilling
 * - Realistic ground shadows and volumetric illumination
 */
export default function RoverModel({
  x,
  y,
  scale,
  facing,
  isMoving,
  isDrilling,
}: RoverModelProps) {
  const size = 78;
  const style: CSSProperties & { "--rover-bob": string } = {
    position: "absolute",
    left: x,
    top: y,
    width: size,
    height: size,
    overflow: "visible",
    pointerEvents: "none",
    transform: `translate(-50%, -50%) scale(${scale})`,
    transformOrigin: "center",
    zIndex: 2,
    "--rover-bob": isMoving ? "-2.5px" : "0px",
  };

  return (
    <svg
      aria-label={`Mars exploration rover facing ${facing}`}
      role="img"
      viewBox="0 0 96 96"
      style={style}
    >
      <defs>
        {/* Scoped Realistic Animations */}
        <style>{`
          @keyframes rv-beacon-pulse {
            0%, 100% { opacity: 0.35; transform: scale(0.9); }
            50% { opacity: 1; transform: scale(1.15); }
          }
          @keyframes rv-tread-spin {
            0% { stroke-dashoffset: 0; }
            100% { stroke-dashoffset: 16; }
          }
          @keyframes rv-dust-rise {
            0% { opacity: 0.7; transform: translateY(0) scale(0.8); }
            100% { opacity: 0; transform: translateY(-5px) scale(1.4); }
          }
          @keyframes rv-thermal-core {
            0%, 100% { opacity: 0.65; }
            50% { opacity: 0.95; }
          }
          @keyframes rv-drill-spin-fast {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          @keyframes rv-spark-flicker {
            0%, 100% { opacity: 0; transform: scale(0.5); }
            50% { opacity: 1; transform: scale(1.2); }
          }
          @keyframes rv-headlight-shimmer {
            0%, 100% { opacity: 0.85; }
            50% { opacity: 0.98; }
          }
          .rv-beacon { animation: rv-beacon-pulse 1.4s ease-in-out infinite; transform-origin: center; }
          .rv-thermal { animation: rv-thermal-core 2.2s ease-in-out infinite; }
          .rv-tread-moving { animation: rv-tread-spin 0.4s linear infinite; }
          .rv-dust { animation: rv-dust-rise 0.5s ease-out infinite; transform-origin: center; }
          .rv-spark-1 { animation: rv-spark-flicker 0.16s ease-in-out infinite alternate; }
          .rv-spark-2 { animation: rv-spark-flicker 0.22s ease-in-out 0.08s infinite alternate; }
          .rv-headlight { animation: rv-headlight-shimmer 2s ease-in-out infinite; }
        `}</style>

        {/* ── Materials & Shaders ── */}

        {/* MLI Gold Thermal Blanket */}
        <linearGradient id="rv-gold-foil" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffe28a" />
          <stop offset="25%" stopColor="#f5ba42" />
          <stop offset="60%" stopColor="#c88318" />
          <stop offset="100%" stopColor="#7a4704" />
        </linearGradient>

        {/* Darkened MLI Gold for shaded facets */}
        <linearGradient id="rv-gold-foil-dark" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#d89626" />
          <stop offset="70%" stopColor="#875108" />
          <stop offset="100%" stopColor="#4e2b02" />
        </linearGradient>

        {/* Aerospace Carbon / Titanium Composite Hull */}
        <linearGradient id="rv-composite" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3d4956" />
          <stop offset="50%" stopColor="#252f3a" />
          <stop offset="100%" stopColor="#141a22" />
        </linearGradient>

        {/* Top Deck Anodized Titanium */}
        <linearGradient id="rv-deck" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#5b697a" />
          <stop offset="40%" stopColor="#3e4a57" />
          <stop offset="100%" stopColor="#232c35" />
        </linearGradient>

        {/* Rocker-Bogie Titanium Suspension Tubes */}
        <linearGradient id="rv-titanium" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#cbd5e1" />
          <stop offset="45%" stopColor="#94a3b8" />
          <stop offset="80%" stopColor="#64748b" />
          <stop offset="100%" stopColor="#334155" />
        </linearGradient>

        {/* Machined Aluminum / Titanium Wheels */}
        <linearGradient id="rv-wheel" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2b3542" />
          <stop offset="30%" stopColor="#1e2631" />
          <stop offset="70%" stopColor="#131922" />
          <stop offset="100%" stopColor="#0b0f14" />
        </linearGradient>

        {/* Wheel Hub Metallic Accent */}
        <linearGradient id="rv-wheel-hub" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#94a3b8" />
          <stop offset="50%" stopColor="#475569" />
          <stop offset="100%" stopColor="#1e293b" />
        </linearGradient>

        {/* Optical Camera Sapphire Glass Multi-Coated Lens */}
        <radialGradient id="rv-lens" cx="40%" cy="40%" r="65%">
          <stop offset="0%" stopColor="#e0faff" />
          <stop offset="25%" stopColor="#38e8ff" />
          <stop offset="65%" stopColor="#098db8" />
          <stop offset="100%" stopColor="#02324d" />
        </radialGradient>

        {/* MMRTG Nuclear Power Heat Fin Core */}
        <linearGradient id="rv-rtg-body" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#4b5563" />
          <stop offset="25%" stopColor="#272f38" />
          <stop offset="60%" stopColor="#171d24" />
          <stop offset="100%" stopColor="#0f141a" />
        </linearGradient>

        {/* MMRTG Radioactive Thermal Core Glow */}
        <radialGradient id="rv-thermal-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ff7b39" stopOpacity="0.95" />
          <stop offset="50%" stopColor="#e63900" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#991500" stopOpacity="0" />
        </radialGradient>

        {/* High-Gain Antenna Parabolic Dish */}
        <linearGradient id="rv-dish" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#e2e8f0" />
          <stop offset="40%" stopColor="#94a3b8" />
          <stop offset="85%" stopColor="#475569" />
          <stop offset="100%" stopColor="#1e293b" />
        </linearGradient>

        {/* Headlight Volumetric Beams (Front) */}
        <linearGradient id="rv-light-front" x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor="#fff2be" stopOpacity="0.55" />
          <stop offset="35%" stopColor="#ffdc73" stopOpacity="0.25" />
          <stop offset="75%" stopColor="#ffb930" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#ff9900" stopOpacity="0" />
        </linearGradient>

        {/* Headlight Volumetric Beams (Left) */}
        <linearGradient id="rv-light-left" x1="1" y1="0.5" x2="0" y2="0.8">
          <stop offset="0%" stopColor="#fff2be" stopOpacity="0.55" />
          <stop offset="40%" stopColor="#ffdc73" stopOpacity="0.22" />
          <stop offset="80%" stopColor="#ffb930" stopOpacity="0.06" />
          <stop offset="100%" stopColor="#ff9900" stopOpacity="0" />
        </linearGradient>

        {/* Headlight Volumetric Beams (Right) */}
        <linearGradient id="rv-light-right" x1="0" y1="0.5" x2="1" y2="0.8">
          <stop offset="0%" stopColor="#fff2be" stopOpacity="0.55" />
          <stop offset="40%" stopColor="#ffdc73" stopOpacity="0.22" />
          <stop offset="80%" stopColor="#ffb930" stopOpacity="0.06" />
          <stop offset="100%" stopColor="#ff9900" stopOpacity="0" />
        </linearGradient>

        {/* Ground Ambient Contact Shadow */}
        <radialGradient id="rv-shadow-grad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#080402" stopOpacity="0.85" />
          <stop offset="50%" stopColor="#140803" stopOpacity="0.5" />
          <stop offset="80%" stopColor="#220b04" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#2b0d05" stopOpacity="0" />
        </radialGradient>

        {/* Filters */}
        <filter id="rv-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.8" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <filter id="rv-soft-shadow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="2" />
        </filter>

        {/* Front hazard stripes pattern */}
        <pattern id="rv-hazard-pattern" width="6" height="6" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
          <rect width="3" height="6" fill="#facc15" />
          <rect x="3" width="3" height="6" fill="#18181b" />
        </pattern>
      </defs>

      {/* Realistic Martian Ground Contact Shadows */}
      <ellipse cx="48" cy="70" rx="34" ry="11" fill="url(#rv-shadow-grad)" />
      {/* Individual Wheel Contact Darkening */}
      {facing === "FRONT" && (
        <>
          <ellipse cx="23" cy="70" rx="7" ry="2.5" fill="#050302" opacity="0.6" />
          <ellipse cx="73" cy="70" rx="7" ry="2.5" fill="#050302" opacity="0.6" />
          <ellipse cx="15" cy="64" rx="5" ry="2" fill="#050302" opacity="0.45" />
          <ellipse cx="81" cy="64" rx="5" ry="2" fill="#050302" opacity="0.45" />
        </>
      )}
      {facing === "BACK" && (
        <>
          <ellipse cx="25" cy="70" rx="7" ry="2.5" fill="#050302" opacity="0.6" />
          <ellipse cx="71" cy="70" rx="7" ry="2.5" fill="#050302" opacity="0.6" />
          <ellipse cx="17" cy="64" rx="5" ry="2" fill="#050302" opacity="0.45" />
          <ellipse cx="79" cy="64" rx="5" ry="2" fill="#050302" opacity="0.45" />
        </>
      )}
      {facing === "LEFT" && (
        <>
          <ellipse cx="22" cy="71" rx="8" ry="2.8" fill="#050302" opacity="0.6" />
          <ellipse cx="47" cy="72" rx="8" ry="2.8" fill="#050302" opacity="0.6" />
          <ellipse cx="72" cy="70" rx="8" ry="2.8" fill="#050302" opacity="0.6" />
        </>
      )}
      {facing === "RIGHT" && (
        <>
          <ellipse cx="24" cy="70" rx="8" ry="2.8" fill="#050302" opacity="0.6" />
          <ellipse cx="49" cy="72" rx="8" ry="2.8" fill="#050302" opacity="0.6" />
          <ellipse cx="74" cy="71" rx="8" ry="2.8" fill="#050302" opacity="0.6" />
        </>
      )}

      {/* Main Rover Body with Dynamic Suspension Bobbing */}
      <g className={isMoving ? "rover-bounce" : undefined}>
        {facing === "FRONT" && <RoverFront isMoving={isMoving} isDrilling={isDrilling} />}
        {facing === "BACK" && <RoverBack isMoving={isMoving} isDrilling={isDrilling} />}
        {facing === "LEFT" && <RoverLeft isMoving={isMoving} isDrilling={isDrilling} />}
        {facing === "RIGHT" && <RoverRight isMoving={isMoving} isDrilling={isDrilling} />}
      </g>
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   1. FRONT VIEW (Forward 3/4 Isometric Perspective)
   - Features: Forward LED Headlights projecting volumetric light cones,
     Stereo Hazcams on front bumper, Bumper Caution Stripes,
     Front-mounted Mastcam-Z tower facing forward with dual sapphire lenses,
     Stereo Rocker-Bogie front wheels with steering actuators,
     Quilted MLI gold foil blanket deck, and Front Robotic Arm with Coring Drill.
   ═══════════════════════════════════════════════════════════════════════════ */
function RoverFront({ isMoving, isDrilling }: { isMoving: boolean; isDrilling: boolean }) {
  return (
    <g id="rover-front-view">
      {/* ── Volumetric Headlight Beams on Martian Surface ── */}
      <g className="rv-headlight" pointerEvents="none">
        {/* Left headlight beam */}
        <polygon
          points="31,48 10,79 46,84 37,48"
          fill="url(#rv-light-front)"
        />
        {/* Right headlight beam */}
        <polygon
          points="59,48 50,84 86,79 65,48"
          fill="url(#rv-light-front)"
        />
      </g>

      {/* ── Rear/Background Suspension & Wheels (Receding Perspective) ── */}
      {/* Rear-left wheel */}
      <g>
        <rect x="12" y="52" width="7" height="13" rx="3.5" fill="url(#rv-wheel)" stroke="#475569" strokeWidth="0.8" />
        <ellipse cx="15.5" cy="58.5" rx="2" ry="3.5" fill="url(#rv-wheel-hub)" />
        {/* Receding suspension bar */}
        <path d="M19 56 L30 48" stroke="url(#rv-titanium)" strokeWidth="1.8" strokeLinecap="round" />
      </g>
      {/* Rear-right wheel */}
      <g>
        <rect x="77" y="52" width="7" height="13" rx="3.5" fill="url(#rv-wheel)" stroke="#475569" strokeWidth="0.8" />
        <ellipse cx="80.5" cy="58.5" rx="2" ry="3.5" fill="url(#rv-wheel-hub)" />
        <path d="M77 56 L66 48" stroke="url(#rv-titanium)" strokeWidth="1.8" strokeLinecap="round" />
      </g>

      {/* ── Main Chassis Lower Hull (Carbon Composite Underbody) ── */}
      <polygon
        points="26,45 48,37 70,45 70,54 48,61 26,54"
        fill="url(#rv-composite)"
        stroke="#1e293b"
        strokeWidth="1.2"
      />
      {/* Underbody bevel shadow */}
      <polygon
        points="26,54 48,61 70,54 67,57 48,63 29,57"
        fill="#0b0f14"
        opacity="0.8"
      />

      {/* ── Front Rocker-Bogie Suspension Arms ── */}
      {/* Left main suspension strut */}
      <path d="M28 50 L24 59 L36 49" fill="none" stroke="url(#rv-titanium)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      {/* Right main suspension strut */}
      <path d="M68 50 L72 59 L60 49" fill="none" stroke="url(#rv-titanium)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      {/* Differential pivot knuckle */}
      <circle cx="36" cy="49" r="2.2" fill="#94a3b8" stroke="#1e293b" strokeWidth="0.8" />
      <circle cx="60" cy="49" r="2.2" fill="#94a3b8" stroke="#1e293b" strokeWidth="0.8" />

      {/* ── Front Left Wheel ── */}
      <g>
        <rect x="18" y="56" width="10" height="16" rx="4" fill="url(#rv-wheel)" stroke="#64748b" strokeWidth="1" />
        {/* Chevron Tread Cleats */}
        <g
          stroke="#94a3b8"
          strokeWidth="0.9"
          strokeLinecap="round"
          strokeDasharray="2.5 3.5"
          className={isMoving ? "rv-tread-moving" : undefined}
        >
          <line x1="20" y1="58" x2="26" y2="58" />
          <line x1="20" y1="62" x2="26" y2="62" />
          <line x1="20" y1="66" x2="26" y2="66" />
          <line x1="20" y1="70" x2="26" y2="70" />
        </g>
        {/* Wheel Hub & Spokes */}
        <circle cx="23" cy="64" r="3.2" fill="url(#rv-wheel-hub)" stroke="#94a3b8" strokeWidth="0.8" />
        <circle cx="23" cy="64" r="1.2" fill="#0f172a" />
        {/* Steering actuator cylinder */}
        <rect x="26" y="57" width="2.5" height="5" rx="1" fill="#475569" stroke="#1e293b" strokeWidth="0.5" />
      </g>

      {/* ── Front Right Wheel ── */}
      <g>
        <rect x="68" y="56" width="10" height="16" rx="4" fill="url(#rv-wheel)" stroke="#64748b" strokeWidth="1" />
        <g
          stroke="#94a3b8"
          strokeWidth="0.9"
          strokeLinecap="round"
          strokeDasharray="2.5 3.5"
          className={isMoving ? "rv-tread-moving" : undefined}
        >
          <line x1="70" y1="58" x2="76" y2="58" />
          <line x1="70" y1="62" x2="76" y2="62" />
          <line x1="70" y1="66" x2="76" y2="66" />
          <line x1="70" y1="70" x2="76" y2="70" />
        </g>
        <circle cx="73" cy="64" r="3.2" fill="url(#rv-wheel-hub)" stroke="#94a3b8" strokeWidth="0.8" />
        <circle cx="73" cy="64" r="1.2" fill="#0f172a" />
        <rect x="67.5" y="57" width="2.5" height="5" rx="1" fill="#475569" stroke="#1e293b" strokeWidth="0.5" />
      </g>

      {/* ── Front Bumper & Caution Hazard Bar ── */}
      <polygon
        points="30,52 48,56 66,52 66,54 48,59 30,54"
        fill="url(#rv-hazard-pattern)"
        stroke="#475569"
        strokeWidth="0.8"
      />
      {/* Center Tow/Docking Loop */}
      <circle cx="48" cy="57" r="1.6" fill="none" stroke="#e2e8f0" strokeWidth="1" />

      {/* ── Main Deck: Quilted Gold Thermal Foil Insulation (MLI) ── */}
      <polygon
        points="27,45 48,34 69,45 48,52"
        fill="url(#rv-gold-foil)"
        stroke="#ffd56b"
        strokeWidth="1.2"
      />
      {/* Foil Quilting Seam Lines */}
      <path
        d="M37 40 L58 48 M38 48 L59 40 M48 34 L48 52"
        stroke="#8f5707"
        strokeWidth="0.7"
        opacity="0.6"
      />
      {/* Top Deck Equipment Plate (Titanium/Avionics Deck) */}
      <polygon
        points="34,42 48,35 62,42 48,47"
        fill="url(#rv-deck)"
        stroke="#94a3b8"
        strokeWidth="0.8"
      />
      {/* NASA/ARES Mission Insignia Chevron */}
      <path d="M45 44 L48 40 L51 44" fill="none" stroke="#38bdf8" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="48" cy="38" r="0.9" fill="#f43f5e" />

      {/* ── Stereo Hazcams (Hazard Avoidance Cameras on Front) ── */}
      <rect x="42" y="47" width="12" height="4" rx="1" fill="#0f172a" stroke="#64748b" strokeWidth="0.6" />
      <circle cx="45" cy="49" r="1.4" fill="url(#rv-lens)" />
      <circle cx="51" cy="49" r="1.4" fill="url(#rv-lens)" />
      {/* Hazcam lens specular reflection */}
      <circle cx="44.6" cy="48.6" r="0.4" fill="#ffffff" />
      <circle cx="50.6" cy="48.6" r="0.4" fill="#ffffff" />

      {/* ── Dual LED Headlights ── */}
      {/* Left Headlight */}
      <circle cx="32" cy="47" r="2.4" fill="#ffffff" stroke="#94a3b8" strokeWidth="0.8" filter="url(#rv-glow)" />
      <circle cx="32" cy="47" r="1.2" fill="#fef08a" />
      {/* Right Headlight */}
      <circle cx="64" cy="47" r="2.4" fill="#ffffff" stroke="#94a3b8" strokeWidth="0.8" filter="url(#rv-glow)" />
      <circle cx="64" cy="47" r="1.2" fill="#fef08a" />

      {/* ── UHF Low-Gain Antenna Spire (Rear-Left Deck) ── */}
      <ellipse cx="34" cy="40.5" rx="1.8" ry="1" fill="#1e293b" stroke="#cbd5e1" strokeWidth="0.6" />
      <line x1="34" y1="40" x2="34" y2="23" stroke="url(#rv-titanium)" strokeWidth="1.4" strokeLinecap="round" />
      <line x1="34" y1="30" x2="37" y2="30" stroke="#cbd5e1" strokeWidth="0.7" />
      <circle cx="34" cy="22" r="1.8" fill="#f43f5e" className="rv-beacon" filter="url(#rv-glow)" />
      <circle cx="34" cy="22" r="0.8" fill="#ffffff" />

      {/* ── High-Gain Antenna (HGA) Steerable Parabolic Dish (Rear-Right Deck) ── */}
      {/* Deck Mounting Collar / Flange */}
      <ellipse cx="58" cy="39.5" rx="2.5" ry="1.2" fill="#1e293b" stroke="#cbd5e1" strokeWidth="0.8" />
      {/* 2-Axis Gimbal Pedestal / Mast securely connected to the deck */}
      <line x1="58" y1="40" x2="58" y2="31" stroke="url(#rv-titanium)" strokeWidth="2.4" strokeLinecap="round" />
      {/* Gimbal Articulation Pivot Knuckle */}
      <circle cx="58" cy="31" r="1.8" fill="#334155" stroke="#94a3b8" strokeWidth="0.8" />
      {/* Parabolic Dish Reflector */}
      <ellipse cx="58" cy="26" rx="7.5" ry="5" fill="url(#rv-dish)" stroke="#cbd5e1" strokeWidth="0.9" />
      <circle cx="58" cy="26" r="1.4" fill="#334155" />
      {/* Central Sub-Reflector Feed Horn & Antenna Rod */}
      <line x1="58" y1="26" x2="62" y2="21" stroke="#94a3b8" strokeWidth="0.9" />
      <circle cx="62" cy="21" r="0.8" fill="#f8fafc" />

      {/* ── Remote Sensing Mast & Mastcam-Z Tower (Front View) ── */}
      {/* Mast Support Struts & Neck */}
      <line x1="38" y1="37" x2="38" y2="23" stroke="url(#rv-titanium)" strokeWidth="3" strokeLinecap="round" />
      <line x1="36" y1="36" x2="38" y2="25" stroke="#64748b" strokeWidth="1" />
      <line x1="40" y1="36" x2="38" y2="25" stroke="#64748b" strokeWidth="1" />
      {/* Articulation Gimbal Joint */}
      <circle cx="38" cy="23" r="2.4" fill="#334155" stroke="#94a3b8" strokeWidth="0.8" />

      {/* Mastcam-Z Stereo Camera Turret Bar */}
      <polygon
        points="30,16 46,16 48,22 28,22"
        fill="#e2e8f0"
        stroke="#475569"
        strokeWidth="1"
      />
      {/* Stereo Zoom Camera Barrels */}
      <rect x="31" y="17" width="5" height="5" rx="1.5" fill="#1e293b" stroke="#38bdf8" strokeWidth="0.7" />
      <rect x="40" y="17" width="5" height="5" rx="1.5" fill="#1e293b" stroke="#38bdf8" strokeWidth="0.7" />
      {/* Sapphire Coated Zoom Lenses */}
      <circle cx="33.5" cy="19.5" r="1.8" fill="url(#rv-lens)" />
      <circle cx="42.5" cy="19.5" r="1.8" fill="url(#rv-lens)" />
      <circle cx="33" cy="19" r="0.5" fill="#ffffff" />
      <circle cx="42" cy="19" r="0.5" fill="#ffffff" />
      {/* Center SuperCam / ChemCam Laser Spectrometer Aperture */}
      <circle cx="38" cy="19" r="1.4" fill="#ef4444" stroke="#991b1b" strokeWidth="0.6" filter="url(#rv-glow)" />

      {/* Meteorological Sensor (MEDA) & Status Navigation Beacon */}
      <line x1="38" y1="16" x2="38" y2="10" stroke="#cbd5e1" strokeWidth="1.2" />
      <circle cx="38" cy="9.5" r="2" fill="#38bdf8" className="rv-beacon" filter="url(#rv-glow)" />
      <circle cx="38" cy="9.5" r="0.9" fill="#ffffff" />

      {/* ── Dust Particles when Driving ── */}
      {isMoving && (
        <g className="rv-dust" fill="#ea580c" opacity="0.6">
          <circle cx="15" cy="68" r="2.2" />
          <circle cx="20" cy="72" r="1.8" />
          <circle cx="78" cy="68" r="2.2" />
          <circle cx="83" cy="72" r="1.8" />
        </g>
      )}

      {/* ── Robotic Arm & Turret Drill (Articulated on Front-Right) ── */}
      {isDrilling ? (
        <g id="front-active-drill">
          {/* Extended articulated arm */}
          <path d="M56 46 L68 54 L62 66 L62 74" fill="none" stroke="url(#rv-titanium)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="68" cy="54" r="2" fill="#334155" stroke="#94a3b8" strokeWidth="0.8" />
          <circle cx="62" cy="66" r="2" fill="#334155" stroke="#94a3b8" strokeWidth="0.8" />
          {/* Rotary Drill Head & Vibration */}
          <g className="rover-drill">
            {/* Core Drill Turret */}
            <rect x="59" y="68" width="6" height="6" rx="1.5" fill="#1e293b" stroke="#cbd5e1" strokeWidth="0.8" />
            {/* Spinning Carbide Drill Bit */}
            <path d="M62 74 L60 81 L64 81 Z" fill="#f59e0b" stroke="#d97706" strokeWidth="0.8" />
            <line x1="60.5" y1="76" x2="63.5" y2="76" stroke="#ffffff" strokeWidth="0.8" />
            <line x1="61" y1="79" x2="63" y2="79" stroke="#ffffff" strokeWidth="0.8" />
            {/* Laser Guidance Targeting Point */}
            <line x1="62" y1="70" x2="62" y2="82" stroke="#22c55e" strokeWidth="0.8" opacity="0.8" strokeDasharray="1 1" />
            <circle cx="62" cy="82" r="1.2" fill="#22c55e" filter="url(#rv-glow)" />
            {/* Sparks & Rock Fragments */}
            <circle cx="59" cy="80" r="1.2" fill="#fef08a" className="rv-spark-1" filter="url(#rv-glow)" />
            <circle cx="65" cy="80" r="1.2" fill="#f97316" className="rv-spark-2" filter="url(#rv-glow)" />
            <ellipse cx="62" cy="82" rx="4" ry="1.5" fill="none" stroke="#f59e0b" strokeWidth="0.8" opacity="0.6" />
          </g>
        </g>
      ) : (
        /* Stowed Robotic Arm on Front Deck */
        <path
          d="M56 46 L64 43 L68 47 L66 52"
          fill="none"
          stroke="url(#rv-titanium)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </g>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   2. BACK VIEW (Rear / Stern Isometric Perspective)
   - Features: Prominent Multi-Mission Radioisotope Thermoelectric Generator (MMRTG)
     with 8 dark titanium heat-sink cooling fins and glowing thermal core,
     High-Gain Antenna (HGA) steerable parabolic dish pointing up-aft,
     UHF Low-Gain Antenna mast with blinking satellite strobe,
     Rear Hazard Avoidance Cameras (Hazcams), Sample Caching Bay,
     and Rear Rocker-Bogie wheels with visible drive motors and power conduits.
   ═══════════════════════════════════════════════════════════════════════════ */
function RoverBack({ isMoving, isDrilling }: { isMoving: boolean; isDrilling: boolean }) {
  return (
    <g id="rover-back-view">
      {/* ── Background Wheels (Front Wheels receding in distance) ── */}
      <g>
        <rect x="14" y="52" width="7" height="13" rx="3.5" fill="url(#rv-wheel)" stroke="#475569" strokeWidth="0.8" />
        <ellipse cx="17.5" cy="58.5" rx="2" ry="3.5" fill="url(#rv-wheel-hub)" />
        <path d="M21 56 L30 48" stroke="url(#rv-titanium)" strokeWidth="1.8" strokeLinecap="round" />
      </g>
      <g>
        <rect x="75" y="52" width="7" height="13" rx="3.5" fill="url(#rv-wheel)" stroke="#475569" strokeWidth="0.8" />
        <ellipse cx="78.5" cy="58.5" rx="2" ry="3.5" fill="url(#rv-wheel-hub)" />
        <path d="M75 56 L66 48" stroke="url(#rv-titanium)" strokeWidth="1.8" strokeLinecap="round" />
      </g>

      {/* ── Main Chassis Lower Hull ── */}
      <polygon
        points="26,45 48,37 70,45 70,54 48,61 26,54"
        fill="url(#rv-composite)"
        stroke="#1e293b"
        strokeWidth="1.2"
      />
      {/* Rear Differential Crossbar */}
      <path d="M30 48 L48 44 L66 48" fill="none" stroke="url(#rv-titanium)" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="48" cy="44" r="2.5" fill="#334155" stroke="#94a3b8" strokeWidth="0.8" />

      {/* ── Rear Left & Right Wheels (Foreground) ── */}
      {/* Rear-Left Wheel */}
      <g>
        <rect x="19" y="56" width="10" height="16" rx="4" fill="url(#rv-wheel)" stroke="#64748b" strokeWidth="1" />
        {/* Drive motor casing on inside of wheel */}
        <rect x="25" y="59" width="4" height="8" rx="1.5" fill="#334155" stroke="#1e293b" strokeWidth="0.6" />
        {/* Cable harness loop */}
        <path d="M27 61 Q31 56 34 52" fill="none" stroke="#ea580c" strokeWidth="0.9" />
        {/* Cleats */}
        <g
          stroke="#94a3b8"
          strokeWidth="0.9"
          strokeLinecap="round"
          strokeDasharray="2.5 3.5"
          className={isMoving ? "rv-tread-moving" : undefined}
        >
          <line x1="20" y1="58" x2="26" y2="58" />
          <line x1="20" y1="62" x2="26" y2="62" />
          <line x1="20" y1="66" x2="26" y2="66" />
          <line x1="20" y1="70" x2="26" y2="70" />
        </g>
        <circle cx="24" cy="64" r="3.2" fill="url(#rv-wheel-hub)" stroke="#94a3b8" strokeWidth="0.8" />
        <circle cx="24" cy="64" r="1.2" fill="#0f172a" />
      </g>

      {/* Rear-Right Wheel */}
      <g>
        <rect x="67" y="56" width="10" height="16" rx="4" fill="url(#rv-wheel)" stroke="#64748b" strokeWidth="1" />
        <rect x="67" y="59" width="4" height="8" rx="1.5" fill="#334155" stroke="#1e293b" strokeWidth="0.6" />
        <path d="M69 61 Q65 56 62 52" fill="none" stroke="#ea580c" strokeWidth="0.9" />
        <g
          stroke="#94a3b8"
          strokeWidth="0.9"
          strokeLinecap="round"
          strokeDasharray="2.5 3.5"
          className={isMoving ? "rv-tread-moving" : undefined}
        >
          <line x1="69" y1="58" x2="75" y2="58" />
          <line x1="69" y1="62" x2="75" y2="62" />
          <line x1="69" y1="66" x2="75" y2="66" />
          <line x1="69" y1="70" x2="75" y2="70" />
        </g>
        <circle cx="72" cy="64" r="3.2" fill="url(#rv-wheel-hub)" stroke="#94a3b8" strokeWidth="0.8" />
        <circle cx="72" cy="64" r="1.2" fill="#0f172a" />
      </g>

      {/* ── Main Deck Foil ── */}
      <polygon
        points="27,45 48,34 69,45 48,52"
        fill="url(#rv-gold-foil-dark)"
        stroke="#ffd56b"
        strokeWidth="1.2"
      />
      {/* Sample Caching Storage Hatch */}
      <rect x="42" y="45" width="12" height="6" rx="1.5" fill="#1e293b" stroke="#64748b" strokeWidth="0.8" />
      <circle cx="45" cy="48" r="0.8" fill="#38bdf8" />
      <circle cx="48" cy="48" r="0.8" fill="#38bdf8" />
      <circle cx="51" cy="48" r="0.8" fill="#38bdf8" />

      {/* Rear Hazard Avoidance Cameras (Hazcams) */}
      <circle cx="34" cy="47" r="1.3" fill="url(#rv-lens)" />
      <circle cx="62" cy="47" r="1.3" fill="url(#rv-lens)" />
      {/* Rear Warning Position Beacons */}
      <circle cx="28" cy="47" r="1.5" fill="#ef4444" filter="url(#rv-glow)" />
      <circle cx="68" cy="47" r="1.5" fill="#f59e0b" filter="url(#rv-glow)" />

      {/* ── THE ICONIC MMRTG (Nuclear Radioisotope Thermoelectric Generator) ── */}
      {/* Mounting Trunnion Bracket extending from rear */}
      <path d="M42 48 L42 55 L54 55 L54 48" fill="#111827" stroke="#475569" strokeWidth="1" />

      {/* Radioactive Core Thermal Glow */}
      <ellipse cx="48" cy="57" rx="8" ry="4" fill="url(#rv-thermal-glow)" className="rv-thermal" />

      {/* MMRTG Cylindrical Body */}
      <rect x="42" y="52" width="12" height="9" rx="2" fill="url(#rv-rtg-body)" stroke="#64748b" strokeWidth="0.9" />

      {/* 8 Radial Titanium Heat-Sink Cooling Fins */}
      <g stroke="#94a3b8" strokeWidth="1.2" strokeLinecap="round">
        <line x1="42" y1="53" x2="37" y2="51" />
        <line x1="42" y1="56" x2="36" y2="56" />
        <line x1="42" y1="59" x2="37" y2="61" />
        <line x1="54" y1="53" x2="59" y2="51" />
        <line x1="54" y1="56" x2="60" y2="56" />
        <line x1="54" y1="59" x2="59" y2="61" />
        <line x1="45" y1="61" x2="44" y2="65" />
        <line x1="51" y1="61" x2="52" y2="65" />
      </g>
      {/* Nuclear Radiation Warning Trefoil Decal on RTG Endcap */}
      <circle cx="48" cy="56.5" r="2.2" fill="#0f172a" stroke="#facc15" strokeWidth="0.6" />
      <circle cx="48" cy="56.5" r="0.8" fill="#facc15" />

      {/* ── High-Gain Antenna (HGA) Steerable Parabolic Dish (Rear View) ── */}
      <g id="rear-hga-dish">
        {/* Deck Mounting Base Flange */}
        <ellipse cx="33" cy="41.5" rx="2.4" ry="1.2" fill="#1e293b" stroke="#cbd5e1" strokeWidth="0.7" />
        {/* 2-Axis Gimbal Pedestal extending firmly into the deck */}
        <line x1="33" y1="42" x2="33" y2="30" stroke="url(#rv-titanium)" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="33" cy="30" r="1.8" fill="#334155" stroke="#94a3b8" strokeWidth="0.8" />
        {/* Parabolic Dish Backside (showing ribbing structure) */}
        <ellipse cx="33" cy="24" rx="9" ry="6" fill="url(#rv-dish)" stroke="#cbd5e1" strokeWidth="1" />
        <ellipse cx="33" cy="24" rx="6" ry="4" fill="#334155" opacity="0.6" />
        {/* Hexagonal structural ribs */}
        <line x1="24" y1="24" x2="42" y2="24" stroke="#94a3b8" strokeWidth="0.7" />
        <line x1="33" y1="18" x2="33" y2="30" stroke="#94a3b8" strokeWidth="0.7" />
        <circle cx="33" cy="24" r="1.4" fill="#0f172a" />
      </g>

      {/* ── UHF Low-Gain Antenna Spire with Strobe Beacon ── */}
      <ellipse cx="62" cy="41.5" rx="1.8" ry="1" fill="#1e293b" stroke="#cbd5e1" strokeWidth="0.6" />
      <line x1="62" y1="42" x2="62" y2="20" stroke="url(#rv-titanium)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="62" y1="28" x2="65" y2="28" stroke="#cbd5e1" strokeWidth="0.8" />
      <circle cx="62" cy="19" r="1.8" fill="#f43f5e" className="rv-beacon" filter="url(#rv-glow)" />
      <circle cx="62" cy="19" r="0.8" fill="#ffffff" />

      {/* ── Remote Sensing Mast Backside (Receding) ── */}
      <rect x="42" y="24" width="4" height="12" rx="1" fill="#475569" stroke="#1e293b" strokeWidth="0.8" />
      {/* Backside of Camera Turret (Cooling heat sinks) */}
      <polygon
        points="37,18 47,18 49,24 35,24"
        fill="#64748b"
        stroke="#334155"
        strokeWidth="0.8"
      />
      <line x1="38" y1="20" x2="46" y2="20" stroke="#1e293b" strokeWidth="0.6" />
      <line x1="38" y1="22" x2="46" y2="22" stroke="#1e293b" strokeWidth="0.6" />

      {/* ── Dust Particles when Driving ── */}
      {isMoving && (
        <g className="rv-dust" fill="#ea580c" opacity="0.6">
          <circle cx="24" cy="72" r="2" />
          <circle cx="72" cy="72" r="2" />
          <circle cx="48" cy="68" r="1.8" />
        </g>
      )}

      {/* Drilling Indicator in Rear View */}
      {isDrilling && (
        <g id="rear-drill-reflection">
          <circle cx="74" cy="74" r="3" fill="#f59e0b" opacity="0.3" filter="url(#rv-glow)" />
          <circle cx="74" cy="74" r="1.2" fill="#fef08a" className="rv-spark-1" filter="url(#rv-glow)" />
        </g>
      )}
    </g>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   3. LEFT VIEW (Left 3/4 Isometric Profile)
   - Features: Full dynamic view of the left Rocker-Bogie 3-Wheel Mobility System:
     Front-left wheel, Middle-left wheel, Rear-left wheel connected by titanium
     rocker arm and bogie pivot link with chevron treads and wheel hubs;
     Left Headlight projecting light cone to the left;
     Left Quilted Gold MLI foil flank with avionics port;
     Mastcam-Z tower turned facing left with camera sun visor;
     and Left-deploying Robotic Coring Drill arm when drilling.
   ═══════════════════════════════════════════════════════════════════════════ */
function RoverLeft({ isMoving, isDrilling }: { isMoving: boolean; isDrilling: boolean }) {
  return (
    <g id="rover-left-view">
      {/* ── Left Headlight Volumetric Beam Projected Leftward ── */}
      <polygon
        points="22,46 2,68 18,84 32,50"
        fill="url(#rv-light-left)"
        className="rv-headlight"
        pointerEvents="none"
      />

      {/* Far Side (Right) Wheels partially visible underneath */}
      <rect x="64" y="52" width="6" height="12" rx="3" fill="#111827" opacity="0.7" />
      <rect x="40" y="54" width="6" height="12" rx="3" fill="#111827" opacity="0.7" />

      {/* ── Main Chassis Body (Side Profile) ── */}
      {/* Gold Thermal MLI Blanket on Left Flank */}
      <polygon
        points="20,44 68,38 74,48 24,54"
        fill="url(#rv-gold-foil)"
        stroke="#ffd56b"
        strokeWidth="1.2"
      />
      {/* Foil Quilt Lines */}
      <line x1="32" y1="42" x2="35" y2="52" stroke="#875108" strokeWidth="0.8" opacity="0.6" />
      <line x1="44" y1="40" x2="47" y2="50" stroke="#875108" strokeWidth="0.8" opacity="0.6" />
      <line x1="56" y1="39" x2="59" y2="49" stroke="#875108" strokeWidth="0.8" opacity="0.6" />
      {/* Top Deck Line */}
      <polygon
        points="22,42 66,36 68,39 20,44"
        fill="url(#rv-deck)"
        stroke="#94a3b8"
        strokeWidth="0.8"
      />
      {/* Umbilical Service Port & NASA Insignia */}
      <circle cx="38" cy="46" r="1.5" fill="#1e293b" stroke="#38bdf8" strokeWidth="0.6" />
      <rect x="50" y="44" width="7" height="3" rx="0.8" fill="#0f172a" stroke="#cbd5e1" strokeWidth="0.5" />
      <circle cx="52" cy="45.5" r="0.6" fill="#f43f5e" />

      {/* Front Bumper Caution Markings on Left Tip */}
      <polygon points="18,46 22,44 24,49 20,51" fill="url(#rv-hazard-pattern)" stroke="#475569" strokeWidth="0.6" />

      {/* Rear MMRTG Protruding at Aft (Right of SVG) */}
      <rect x="70" y="42" width="7" height="7" rx="1.5" fill="url(#rv-rtg-body)" stroke="#64748b" strokeWidth="0.8" />
      <line x1="77" y1="43" x2="81" y2="42" stroke="#94a3b8" strokeWidth="1" />
      <line x1="77" y1="46" x2="82" y2="46" stroke="#94a3b8" strokeWidth="1" />
      <line x1="77" y1="48" x2="81" y2="49" stroke="#94a3b8" strokeWidth="1" />
      <circle cx="74" cy="45.5" r="1.5" fill="url(#rv-thermal-glow)" className="rv-thermal" />

      {/* High-Gain Antenna (HGA) Dish & Gimbal Mast connected to deck */}
      <ellipse cx="54" cy="38" rx="2.4" ry="1.2" fill="#1e293b" stroke="#cbd5e1" strokeWidth="0.6" />
      <line x1="54" y1="38" x2="54" y2="28" stroke="url(#rv-titanium)" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="54" cy="28" r="1.6" fill="#334155" stroke="#94a3b8" strokeWidth="0.8" />
      <ellipse cx="54" cy="24" rx="7.5" ry="5" fill="url(#rv-dish)" stroke="#cbd5e1" strokeWidth="0.8" />
      <circle cx="54" cy="24" r="1.2" fill="#334155" />
      <line x1="54" y1="24" x2="48" y2="20" stroke="#94a3b8" strokeWidth="0.8" />
      <circle cx="48" cy="20" r="0.7" fill="#cbd5e1" />

      {/* UHF Low-Gain Antenna Spire connected to deck */}
      <ellipse cx="64" cy="37" rx="1.6" ry="0.8" fill="#1e293b" stroke="#cbd5e1" strokeWidth="0.6" />
      <line x1="64" y1="37" x2="64" y2="20" stroke="url(#rv-titanium)" strokeWidth="1.4" strokeLinecap="round" />
      <line x1="64" y1="27" x2="67" y2="27" stroke="#cbd5e1" strokeWidth="0.7" />
      <circle cx="64" cy="19" r="1.6" fill="#f43f5e" className="rv-beacon" filter="url(#rv-glow)" />
      <circle cx="64" cy="19" r="0.7" fill="#ffffff" />

      {/* ── Remote Sensing Mast & Mastcam-Z (Angled Left) ── */}
      <line x1="28" y1="42" x2="28" y2="22" stroke="url(#rv-titanium)" strokeWidth="2.8" strokeLinecap="round" />
      <circle cx="28" cy="22" r="2.2" fill="#334155" stroke="#94a3b8" strokeWidth="0.8" />
      {/* Camera Housing turned left */}
      <polygon
        points="19,16 33,16 35,22 21,22"
        fill="#e2e8f0"
        stroke="#475569"
        strokeWidth="1"
      />
      {/* Camera Lens pointing left with glare */}
      <circle cx="21" cy="19" r="2.2" fill="url(#rv-lens)" stroke="#38bdf8" strokeWidth="0.7" />
      <circle cx="20.3" cy="18.3" r="0.6" fill="#ffffff" />
      {/* Sun Visor / Lens Hood */}
      <path d="M19 16.5 L16 17 L16 21 L19 21.5" fill="none" stroke="#475569" strokeWidth="0.8" />
      {/* Navigation Beacon */}
      <line x1="28" y1="16" x2="28" y2="10" stroke="#cbd5e1" strokeWidth="1.2" />
      <circle cx="28" cy="9.5" r="2" fill="#38bdf8" className="rv-beacon" filter="url(#rv-glow)" />

      {/* Left Headlight */}
      <circle cx="20" cy="46" r="2.4" fill="#ffffff" stroke="#94a3b8" strokeWidth="0.8" filter="url(#rv-glow)" />
      <circle cx="20" cy="46" r="1.2" fill="#fef08a" />

      {/* ── ROCKER-BOGIE MOBILITY SYSTEM (LEFT SIDE) ── */}
      {/* Main Rocker Arm: Pivots at (46, 48), connects to Front Wheel (22, 62) and Bogie Pivot (58, 52) */}
      <path
        d="M22 62 L46 48 L58 52"
        fill="none"
        stroke="url(#rv-titanium)"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Bogie Arm: Pivots at (58, 52), connects to Middle Wheel (47, 63) and Rear Wheel (72, 62) */}
      <path
        d="M47 63 L58 52 L72 62"
        fill="none"
        stroke="url(#rv-titanium)"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Rocker & Bogie Pivot Knuckles */}
      <circle cx="46" cy="48" r="2.8" fill="#334155" stroke="#cbd5e1" strokeWidth="1" />
      <circle cx="58" cy="52" r="2.2" fill="#334155" stroke="#cbd5e1" strokeWidth="0.8" />

      {/* ── 3 Left Wheels with Chevron Cleats ── */}
      {/* 1. Front-Left Wheel */}
      <g>
        <rect x="17" y="56" width="10" height="16" rx="4" fill="url(#rv-wheel)" stroke="#64748b" strokeWidth="1" />
        <g
          stroke="#94a3b8"
          strokeWidth="0.9"
          strokeLinecap="round"
          strokeDasharray="2.5 3.5"
          className={isMoving ? "rv-tread-moving" : undefined}
        >
          <line x1="19" y1="58" x2="25" y2="58" />
          <line x1="19" y1="62" x2="25" y2="62" />
          <line x1="19" y1="66" x2="25" y2="66" />
          <line x1="19" y1="70" x2="25" y2="70" />
        </g>
        <circle cx="22" cy="64" r="3.4" fill="url(#rv-wheel-hub)" stroke="#94a3b8" strokeWidth="0.8" />
        <circle cx="22" cy="64" r="1.3" fill="#0f172a" />
      </g>

      {/* 2. Middle-Left Wheel */}
      <g>
        <rect x="42" y="57" width="10" height="16" rx="4" fill="url(#rv-wheel)" stroke="#64748b" strokeWidth="1" />
        <g
          stroke="#94a3b8"
          strokeWidth="0.9"
          strokeLinecap="round"
          strokeDasharray="2.5 3.5"
          className={isMoving ? "rv-tread-moving" : undefined}
        >
          <line x1="44" y1="59" x2="50" y2="59" />
          <line x1="44" y1="63" x2="50" y2="63" />
          <line x1="44" y1="67" x2="50" y2="67" />
          <line x1="44" y1="71" x2="50" y2="71" />
        </g>
        <circle cx="47" cy="65" r="3.4" fill="url(#rv-wheel-hub)" stroke="#94a3b8" strokeWidth="0.8" />
        <circle cx="47" cy="65" r="1.3" fill="#0f172a" />
      </g>

      {/* 3. Rear-Left Wheel */}
      <g>
        <rect x="67" y="55" width="10" height="16" rx="4" fill="url(#rv-wheel)" stroke="#64748b" strokeWidth="1" />
        <g
          stroke="#94a3b8"
          strokeWidth="0.9"
          strokeLinecap="round"
          strokeDasharray="2.5 3.5"
          className={isMoving ? "rv-tread-moving" : undefined}
        >
          <line x1="69" y1="57" x2="75" y2="57" />
          <line x1="69" y1="61" x2="75" y2="61" />
          <line x1="69" y1="65" x2="75" y2="65" />
          <line x1="69" y1="69" x2="75" y2="69" />
        </g>
        <circle cx="72" cy="63" r="3.4" fill="url(#rv-wheel-hub)" stroke="#94a3b8" strokeWidth="0.8" />
        <circle cx="72" cy="63" r="1.3" fill="#0f172a" />
      </g>

      {/* ── Dust Particles when Driving ── */}
      {isMoving && (
        <g className="rv-dust" fill="#ea580c" opacity="0.6">
          <circle cx="28" cy="72" r="2.2" />
          <circle cx="53" cy="73" r="2" />
          <circle cx="78" cy="71" r="2.5" />
        </g>
      )}

      {/* ── Articulated Robotic Arm & Coring Drill (Left Profile) ── */}
      {isDrilling ? (
        <g id="left-active-drill">
          {/* Extended arm segments reaching left-downward */}
          <path d="M22 47 L12 55 L8 67 L8 76" fill="none" stroke="url(#rv-titanium)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="12" cy="55" r="2" fill="#334155" stroke="#cbd5e1" strokeWidth="0.8" />
          <g className="rover-drill">
            {/* Turret drill */}
            <rect x="5" y="70" width="6" height="6" rx="1.5" fill="#1e293b" stroke="#cbd5e1" strokeWidth="0.8" />
            <path d="M8 76 L6 83 L10 83 Z" fill="#f59e0b" stroke="#d97706" strokeWidth="0.8" />
            <line x1="8" y1="72" x2="8" y2="84" stroke="#22c55e" strokeWidth="0.8" strokeDasharray="1 1" />
            <circle cx="8" cy="84" r="1.2" fill="#22c55e" filter="url(#rv-glow)" />
            {/* Sparks */}
            <circle cx="5" cy="82" r="1.2" fill="#fef08a" className="rv-spark-1" filter="url(#rv-glow)" />
            <circle cx="11" cy="82" r="1.2" fill="#f97316" className="rv-spark-2" filter="url(#rv-glow)" />
            <ellipse cx="8" cy="84" rx="4" ry="1.5" fill="none" stroke="#f59e0b" strokeWidth="0.8" opacity="0.6" />
          </g>
        </g>
      ) : (
        /* Stowed Arm on Left */
        <path d="M22 47 L16 45 L13 51" fill="none" stroke="url(#rv-titanium)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </g>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   4. RIGHT VIEW (Right 3/4 Isometric Profile)
   - Features: Full dynamic view of the right Rocker-Bogie 3-Wheel Mobility System:
     Front-right wheel, Middle-right wheel, Rear-right wheel with titanium rocker arm,
     bogie linkage, and chevron treads;
     Right Headlight casting volumetric beam to the right;
     Right Flank with Sample Caching System Carousel & Science Target discs;
     Mastcam-Z tower turned facing right with camera lenses;
     and Right-deploying Robotic Coring Drill arm when drilling.
   ═══════════════════════════════════════════════════════════════════════════ */
function RoverRight({ isMoving, isDrilling }: { isMoving: boolean; isDrilling: boolean }) {
  return (
    <g id="rover-right-view">
      {/* ── Right Headlight Volumetric Beam Projected Rightward ── */}
      <polygon
        points="74,46 94,68 78,84 64,50"
        fill="url(#rv-light-right)"
        className="rv-headlight"
        pointerEvents="none"
      />

      {/* Far Side (Left) Wheels partially visible underneath */}
      <rect x="26" y="52" width="6" height="12" rx="3" fill="#111827" opacity="0.7" />
      <rect x="50" y="54" width="6" height="12" rx="3" fill="#111827" opacity="0.7" />

      {/* ── Main Chassis Body (Right Side Profile) ── */}
      {/* Gold Thermal MLI Blanket on Right Flank */}
      <polygon
        points="28,38 76,44 72,54 22,48"
        fill="url(#rv-gold-foil)"
        stroke="#ffd56b"
        strokeWidth="1.2"
      />
      {/* Foil Quilt Lines */}
      <line x1="40" y1="39" x2="37" y2="49" stroke="#875108" strokeWidth="0.8" opacity="0.6" />
      <line x1="52" y1="40" x2="49" y2="50" stroke="#875108" strokeWidth="0.8" opacity="0.6" />
      <line x1="64" y1="42" x2="61" y2="52" stroke="#875108" strokeWidth="0.8" opacity="0.6" />
      {/* Top Deck Line */}
      <polygon
        points="30,36 74,42 76,44 28,39"
        fill="url(#rv-deck)"
        stroke="#94a3b8"
        strokeWidth="0.8"
      />

      {/* Sample Caching System (SCS) Carousel Door & Science Calibration Targets */}
      <circle cx="58" cy="46" r="3.2" fill="#1e293b" stroke="#cbd5e1" strokeWidth="0.8" />
      <circle cx="58" cy="46" r="2" fill="#0f172a" />
      <circle cx="58" cy="46" r="0.8" fill="#eab308" />
      {/* Spectrometer Calibration Target (Multi-colored target disc) */}
      <rect x="42" y="44" width="7" height="4" rx="0.8" fill="#0f172a" stroke="#cbd5e1" strokeWidth="0.5" />
      <circle cx="44.5" cy="46" r="0.8" fill="#38bdf8" />
      <circle cx="46.5" cy="46" r="0.8" fill="#22c55e" />

      {/* Front Bumper Caution Stripes on Right Tip */}
      <polygon points="76,44 78,46 76,51 72,49" fill="url(#rv-hazard-pattern)" stroke="#475569" strokeWidth="0.6" />

      {/* Rear MMRTG Protruding at Aft (Left of SVG in this view) */}
      <rect x="19" y="42" width="7" height="7" rx="1.5" fill="url(#rv-rtg-body)" stroke="#64748b" strokeWidth="0.8" />
      <line x1="19" y1="43" x2="15" y2="42" stroke="#94a3b8" strokeWidth="1" />
      <line x1="19" y1="46" x2="14" y2="46" stroke="#94a3b8" strokeWidth="1" />
      <line x1="19" y1="48" x2="15" y2="49" stroke="#94a3b8" strokeWidth="1" />
      <circle cx="22" cy="45.5" r="1.5" fill="url(#rv-thermal-glow)" className="rv-thermal" />

      {/* High-Gain Antenna (HGA) Dish & Gimbal Mast connected to deck */}
      <ellipse cx="42" cy="38" rx="2.4" ry="1.2" fill="#1e293b" stroke="#cbd5e1" strokeWidth="0.6" />
      <line x1="42" y1="38" x2="42" y2="28" stroke="url(#rv-titanium)" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="42" cy="28" r="1.6" fill="#334155" stroke="#94a3b8" strokeWidth="0.8" />
      <ellipse cx="42" cy="24" rx="7.5" ry="5" fill="url(#rv-dish)" stroke="#cbd5e1" strokeWidth="0.8" />
      <circle cx="42" cy="24" r="1.2" fill="#334155" />
      <line x1="42" y1="24" x2="48" y2="20" stroke="#94a3b8" strokeWidth="0.8" />
      <circle cx="48" cy="20" r="0.7" fill="#cbd5e1" />

      {/* UHF Low-Gain Antenna Spire connected to deck */}
      <ellipse cx="32" cy="37" rx="1.6" ry="0.8" fill="#1e293b" stroke="#cbd5e1" strokeWidth="0.6" />
      <line x1="32" y1="37" x2="32" y2="20" stroke="url(#rv-titanium)" strokeWidth="1.4" strokeLinecap="round" />
      <line x1="32" y1="27" x2="29" y2="27" stroke="#cbd5e1" strokeWidth="0.7" />
      <circle cx="32" cy="19" r="1.6" fill="#f43f5e" className="rv-beacon" filter="url(#rv-glow)" />
      <circle cx="32" cy="19" r="0.7" fill="#ffffff" />

      {/* ── Remote Sensing Mast & Mastcam-Z (Angled Right) ── */}
      <line x1="68" y1="42" x2="68" y2="22" stroke="url(#rv-titanium)" strokeWidth="2.8" strokeLinecap="round" />
      <circle cx="68" cy="22" r="2.2" fill="#334155" stroke="#94a3b8" strokeWidth="0.8" />
      {/* Camera Housing turned right */}
      <polygon
        points="63,16 77,16 75,22 61,22"
        fill="#e2e8f0"
        stroke="#475569"
        strokeWidth="1"
      />
      {/* Camera Lens pointing right with glare */}
      <circle cx="75" cy="19" r="2.2" fill="url(#rv-lens)" stroke="#38bdf8" strokeWidth="0.7" />
      <circle cx="74.3" cy="18.3" r="0.6" fill="#ffffff" />
      {/* Sun Visor / Lens Hood */}
      <path d="M77 16.5 L80 17 L80 21 L77 21.5" fill="none" stroke="#475569" strokeWidth="0.8" />
      {/* Navigation Beacon */}
      <line x1="68" y1="16" x2="68" y2="10" stroke="#cbd5e1" strokeWidth="1.2" />
      <circle cx="68" cy="9.5" r="2" fill="#38bdf8" className="rv-beacon" filter="url(#rv-glow)" />

      {/* Right Headlight */}
      <circle cx="76" cy="46" r="2.4" fill="#ffffff" stroke="#94a3b8" strokeWidth="0.8" filter="url(#rv-glow)" />
      <circle cx="76" cy="46" r="1.2" fill="#fef08a" />

      {/* ── ROCKER-BOGIE MOBILITY SYSTEM (RIGHT SIDE) ── */}
      {/* Main Rocker Arm: Pivots at (50, 48), connects to Front Wheel (74, 62) and Bogie Pivot (38, 52) */}
      <path
        d="M74 62 L50 48 L38 52"
        fill="none"
        stroke="url(#rv-titanium)"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Bogie Arm: Pivots at (38, 52), connects to Middle Wheel (49, 63) and Rear Wheel (24, 62) */}
      <path
        d="M49 63 L38 52 L24 62"
        fill="none"
        stroke="url(#rv-titanium)"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Rocker & Bogie Pivot Knuckles */}
      <circle cx="50" cy="48" r="2.8" fill="#334155" stroke="#cbd5e1" strokeWidth="1" />
      <circle cx="38" cy="52" r="2.2" fill="#334155" stroke="#cbd5e1" strokeWidth="0.8" />

      {/* ── 3 Right Wheels with Chevron Cleats ── */}
      {/* 1. Rear-Right Wheel */}
      <g>
        <rect x="19" y="55" width="10" height="16" rx="4" fill="url(#rv-wheel)" stroke="#64748b" strokeWidth="1" />
        <g
          stroke="#94a3b8"
          strokeWidth="0.9"
          strokeLinecap="round"
          strokeDasharray="2.5 3.5"
          className={isMoving ? "rv-tread-moving" : undefined}
        >
          <line x1="21" y1="57" x2="27" y2="57" />
          <line x1="21" y1="61" x2="27" y2="61" />
          <line x1="21" y1="65" x2="27" y2="65" />
          <line x1="21" y1="69" x2="27" y2="69" />
        </g>
        <circle cx="24" cy="63" r="3.4" fill="url(#rv-wheel-hub)" stroke="#94a3b8" strokeWidth="0.8" />
        <circle cx="24" cy="63" r="1.3" fill="#0f172a" />
      </g>

      {/* 2. Middle-Right Wheel */}
      <g>
        <rect x="44" y="57" width="10" height="16" rx="4" fill="url(#rv-wheel)" stroke="#64748b" strokeWidth="1" />
        <g
          stroke="#94a3b8"
          strokeWidth="0.9"
          strokeLinecap="round"
          strokeDasharray="2.5 3.5"
          className={isMoving ? "rv-tread-moving" : undefined}
        >
          <line x1="46" y1="59" x2="52" y2="59" />
          <line x1="46" y1="63" x2="52" y2="63" />
          <line x1="46" y1="67" x2="52" y2="67" />
          <line x1="46" y1="71" x2="52" y2="71" />
        </g>
        <circle cx="49" cy="65" r="3.4" fill="url(#rv-wheel-hub)" stroke="#94a3b8" strokeWidth="0.8" />
        <circle cx="49" cy="65" r="1.3" fill="#0f172a" />
      </g>

      {/* 3. Front-Right Wheel */}
      <g>
        <rect x="69" y="56" width="10" height="16" rx="4" fill="url(#rv-wheel)" stroke="#64748b" strokeWidth="1" />
        <g
          stroke="#94a3b8"
          strokeWidth="0.9"
          strokeLinecap="round"
          strokeDasharray="2.5 3.5"
          className={isMoving ? "rv-tread-moving" : undefined}
        >
          <line x1="71" y1="58" x2="77" y2="58" />
          <line x1="71" y1="62" x2="77" y2="62" />
          <line x1="71" y1="66" x2="77" y2="66" />
          <line x1="71" y1="70" x2="77" y2="70" />
        </g>
        <circle cx="74" cy="64" r="3.4" fill="url(#rv-wheel-hub)" stroke="#94a3b8" strokeWidth="0.8" />
        <circle cx="74" cy="64" r="1.3" fill="#0f172a" />
      </g>

      {/* ── Dust Particles when Driving ── */}
      {isMoving && (
        <g className="rv-dust" fill="#ea580c" opacity="0.6">
          <circle cx="18" cy="71" r="2.5" />
          <circle cx="43" cy="73" r="2" />
          <circle cx="68" cy="72" r="2.2" />
        </g>
      )}

      {/* ── Articulated Robotic Arm & Coring Drill (Right Profile) ── */}
      {isDrilling ? (
        <g id="right-active-drill">
          {/* Extended arm segments reaching right-downward */}
          <path d="M74 47 L84 55 L88 67 L88 76" fill="none" stroke="url(#rv-titanium)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="84" cy="55" r="2" fill="#334155" stroke="#cbd5e1" strokeWidth="0.8" />
          <g className="rover-drill">
            {/* Turret drill */}
            <rect x="85" y="70" width="6" height="6" rx="1.5" fill="#1e293b" stroke="#cbd5e1" strokeWidth="0.8" />
            <path d="M88 76 L86 83 L90 83 Z" fill="#f59e0b" stroke="#d97706" strokeWidth="0.8" />
            <line x1="88" y1="72" x2="88" y2="84" stroke="#22c55e" strokeWidth="0.8" strokeDasharray="1 1" />
            <circle cx="88" cy="84" r="1.2" fill="#22c55e" filter="url(#rv-glow)" />
            {/* Sparks */}
            <circle cx="85" cy="82" r="1.2" fill="#fef08a" className="rv-spark-1" filter="url(#rv-glow)" />
            <circle cx="91" cy="82" r="1.2" fill="#f97316" className="rv-spark-2" filter="url(#rv-glow)" />
            <ellipse cx="88" cy="84" rx="4" ry="1.5" fill="none" stroke="#f59e0b" strokeWidth="0.8" opacity="0.6" />
          </g>
        </g>
      ) : (
        /* Stowed Arm on Right */
        <path d="M74 47 L80 45 L83 51" fill="none" stroke="url(#rv-titanium)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </g>
  );
}
