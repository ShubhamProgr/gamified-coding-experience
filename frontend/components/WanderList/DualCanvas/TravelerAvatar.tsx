"use client";

type Props = {
  direction: "forward" | "backward";
  position: number;
};

export default function TravelerAvatar({ direction, position }: Props) {
  return (
    <div className={`wander-tourist wander-tourist--${direction}`} style={{ left: `${10 + position * 21}%` }} aria-label="Tourist traveling between itinerary nodes">
      <div className="wander-tourist__shadow" />
      <div className="wander-tourist__legs"><i /><i /></div>
      <div className="wander-tourist__shoes"><i /><i /></div>
      <div className="wander-tourist__body">
        <span className="wander-tourist__bag" />
        <span className="wander-tourist__arm wander-tourist__arm--front" />
        <span className="wander-tourist__arm wander-tourist__arm--back" />
        <span className="wander-tourist__shirt-pocket" />
      </div>
      <div className="wander-tourist__head">
        <span className="wander-tourist__hat" />
        <span className="wander-tourist__face">
          <i className="wander-tourist__eye" />
          <i className="wander-tourist__nose" />
          <i className="wander-tourist__smile" />
        </span>
      </div>
      <span className="wander-tourist__label">tourist</span>
    </div>
  );
}
