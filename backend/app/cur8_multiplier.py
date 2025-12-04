"""
CUR8 Multiplier System
Calculates XP multiplier based on witness vote and delegation amount.
"""

def calculate_cur8_multiplier(votes_witness: bool, delegation_amount: float) -> float:
    """
    Calculate CUR8 multiplier based on witness vote and delegation.
    
    Rules:
    - Base multiplier: 1.0x
    - Witness vote: +0.5x
    - Delegation: +0.1x per 1000 STEEM delegated
    - Maximum multiplier: 4.0x
    
    Args:
        votes_witness: Whether user votes for cur8.witness
        delegation_amount: Amount of STEEM delegated to cur8
        
    Returns:
        Calculated multiplier (capped at 4.0x)
    """
    multiplier = 1.0
    
    # Add witness vote bonus
    if votes_witness:
        multiplier += 0.5
    
    # Add delegation bonus (0.1x per 1000 STEEM)
    if delegation_amount > 0:
        delegation_bonus = (delegation_amount / 1000.0) * 0.1
        multiplier += delegation_bonus
    
    # Cap at 4.0x
    return min(multiplier, 4.0)


def get_multiplier_breakdown(votes_witness: bool, delegation_amount: float) -> dict:
    """
    Get detailed breakdown of multiplier calculation.
    
    Args:
        votes_witness: Whether user votes for cur8.witness
        delegation_amount: Amount of STEEM delegated to cur8
        
    Returns:
        Dictionary with breakdown details
    """
    base = 1.0
    witness_bonus = 0.5 if votes_witness else 0.0
    delegation_bonus = (delegation_amount / 1000.0) * 0.1 if delegation_amount > 0 else 0.0
    total_uncapped = base + witness_bonus + delegation_bonus
    final_multiplier = min(total_uncapped, 4.0)
    is_capped = total_uncapped > 4.0
    
    return {
        "base": base,
        "witness_bonus": witness_bonus,
        "delegation_bonus": delegation_bonus,
        "delegation_amount": delegation_amount,
        "total_uncapped": total_uncapped,
        "final_multiplier": final_multiplier,
        "is_capped": is_capped,
        "max_multiplier": 4.0
    }
