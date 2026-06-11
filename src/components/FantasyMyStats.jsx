import React from "react";

export default function FantasyMyStats({
  user,
  totalPts = 0,
  exact = 0,
  correct = 0,
  upcomingCount = 0,
  C,
}) {
  return (
    <div
      style={{
        background: `linear-gradient(135deg,${C.s1},${C.s2})`,
        border: `1px solid ${C.b2}`,
        borderRadius: 12,
        padding: 12,
        marginBottom: 12,
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: C.dim,
          marginBottom: 6,
        }}
      >
        MY FANTASY SUMMARY
      </div>

      <div
        style={{
          fontSize: 18,
          fontWeight: 800,
          color: C.gold,
          marginBottom: 10,
        }}
      >
        {user?.name || "Player"}
      </div>

      <div style={{display:"flex",gap:12}}>
        <div style={{flex:1}}>
          <div style={{fontSize:22,fontWeight:900,color:C.green}}>
            {totalPts}
          </div>
          <div style={{fontSize:10,color:C.dim}}>
            Points
          </div>
        </div>

        <div style={{flex:1}}>
          <div style={{fontSize:22,fontWeight:900,color:C.gold}}>
            {exact}
          </div>
          <div style={{fontSize:10,color:C.dim}}>
            Exact Picks
          </div>
        </div>

        <div style={{flex:1}}>
          <div style={{fontSize:22,fontWeight:900,color:C.blue}}>
            {upcomingCount}
          </div>
          <div style={{fontSize:10,color:C.dim}}>
            Pending
          </div>
        </div>
      </div>
    </div>
  );
}