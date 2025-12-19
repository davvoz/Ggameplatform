// Attach click handler to nav multiplier card to open multiplier modal (replicates ProfileRenderer modal)
(function(){
    function getApiUrl(){
        return window.ENV?.API_URL || window.location.origin;
    }

    function createModal(breakdown){
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            animation: fadeIn 0.2s ease-out;
        `;

        modal.innerHTML = `
            <div style="background: var(--background-light); border-radius: 16px; max-width: 450px; width: 90%; max-height: 85vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.5); border: 1px solid var(--border); animation: slideUp 0.3s ease-out;">
                <div style="padding: 16px; border-bottom: 1px solid var(--border);">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <h2 style="margin: 0; font-size: 24px; font-weight: 700; color: var(--text-primary);">⚡ CUR8 Multiplier</h2>
                        <button class="nav-mult-close" style="background: none; border: none; font-size: 28px; color: var(--text-muted); cursor: pointer; padding: 0; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 8px; transition: all 0.2s;">×</button>
                    </div>
                </div>
                <div style="padding: 16px;">
                    <div style="background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 14px; margin-bottom: 12px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                            <span style="font-size: 14px; color: var(--text-secondary); font-weight: 500;">Base Multiplier</span>
                            <span style="font-weight: 700; font-size: 18px; color: var(--text-primary);">+${breakdown.base.toFixed(1)}x</span>
                        </div>
                        <div style="padding: 12px; background: ${breakdown.witness_bonus > 0 ? 'rgba(34, 197, 94, 0.15)' : 'rgba(255, 255, 255, 0.05)'}; border-radius: 10px; border: 2px solid ${breakdown.witness_bonus > 0 ? 'rgba(34, 197, 94, 0.4)' : 'rgba(255, 255, 255, 0.1)'}; margin-bottom: 10px;">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <div style="display: flex; align-items: center; gap: 10px;">
                                    <span style="font-size: 28px;">${breakdown.witness_bonus > 0 ? '✅' : '⬜'}</span>
                                    <div>
                                        <div style="font-size: 15px; color: var(--text-primary); font-weight: 600;">Witness Vote</div>
                                        <div style="font-size: 12px; color: var(--text-secondary); margin-top: 2px;">${breakdown.witness_bonus > 0 ? 'Voting for cur8.witness' : 'Not voting yet'}</div>
                                    </div>
                                    ${breakdown.witness_bonus === 0 ? `<button id="navVoteCur8Btn" style="margin-left:12px; background: linear-gradient(90deg,#16a34a,#059669); color: white; border: none; padding: 6px 10px; border-radius: 8px; font-weight:700; cursor: pointer;">Vote</button>` : ''}
                                </div>
                                <span style="font-weight: 800; font-size: 20px; color: ${breakdown.witness_bonus > 0 ? '#22c55e' : 'var(--text-muted)'};">+${breakdown.witness_bonus.toFixed(1)}x</span>
                            </div>
                        </div>
                        <div style="padding: 12px; background: ${breakdown.delegation_bonus > 0 ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.05)'}; border-radius: 10px; border: 2px solid ${breakdown.delegation_bonus > 0 ? 'rgba(59, 130, 246, 0.4)' : 'rgba(255, 255, 255, 0.1)'};">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom:8px;">
                                <div>
                                    <div style="font-size: 15px; color: var(--text-primary); font-weight: 600;">Steem Delegation</div>
                                    <div style="font-size: 12px; color: var(--text-secondary); margin-top: 2px;">${breakdown.delegation_amount.toFixed(0)} STEEM delegated</div>
                                </div>
                                <span id="navDelegationBonusValue" style="font-weight: 800; font-size: 20px; color: ${breakdown.delegation_bonus > 0 ? '#3b82f6' : 'var(--text-muted)'};">+${breakdown.delegation_bonus.toFixed(2)}x</span>
                            </div>
                            <div style="display:flex; gap:8px; width:100%; align-items:center;">
                                <input id="navDelegateAmountSlider" list="delegateTicks" type="range" min="0" max="10000" step="1" value="${breakdown.delegation_amount.toFixed(0)}" style="flex:1;">
                                <datalist id="delegateTicks"></datalist>
                                <button id="navDelegateCur8Btn" style="background: linear-gradient(90deg,#3b82f6,#2563eb); color: white; border: none; padding: 8px 10px; border-radius: 8px; font-weight:700; cursor: pointer;">Delegate</button>
                            </div>
                        </div>
                        <div style="height: 1px; background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent); margin: 12px 0;"></div>
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span style="font-size: 16px; color: var(--text-primary); font-weight: 700;">Total Multiplier <span style="font-size:12px; color:var(--text-secondary); font-weight:600; margin-left:8px;">(max 4x)</span></span>
                            <span id="navFinalMultiplierValue" style="font-weight: 800; font-size: 24px; color: #818cf8;">${breakdown.final_multiplier.toFixed(2)}x</span>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // close handlers
        modal.querySelector('.nav-mult-close')?.addEventListener('click', () => modal.remove());
        modal.addEventListener('click', (e)=>{ if(e.target===modal) modal.remove(); });

        // wire simple delegation preview update
        const slider = modal.querySelector('#navDelegateAmountSlider');
        const delegationValue = modal.querySelector('#navDelegationBonusValue');
        if(slider && delegationValue){
            slider.addEventListener('input', ()=>{
                const val = Number(slider.value)||0;
                // naive preview: delegation_bonus scales linearly (server does actual calc)
                const preview = Math.min(2.0, (val/10000)*2.0);
                delegationValue.textContent = `+${preview.toFixed(2)}x`;
                const finalEl = modal.querySelector('#navFinalMultiplierValue');
                if(finalEl){
                    const base = breakdown.base||1.0;
                    const newFinal = base + (breakdown.witness_bonus||0) + preview;
                    finalEl.textContent = `${Math.min(4, newFinal).toFixed(2)}x`;
                }
            });
        }

        document.body.appendChild(modal);

        // Attempt to attach vote/delegate action handlers if global functions exist
        const voteBtn = modal.querySelector('#navVoteCur8Btn');
        if(voteBtn && typeof window.voteCur8Witness === 'function'){
            voteBtn.addEventListener('click', ()=> window.voteCur8Witness());
        }
        const delegateBtn = modal.querySelector('#navDelegateCur8Btn');
        if(delegateBtn && typeof window.delegateToCur8 === 'function'){
            delegateBtn.addEventListener('click', ()=> window.delegateToCur8(Number(slider.value)||0));
        }
    }

    async function onClick(e){
        try{
            const user = (window.AuthManager && window.AuthManager.isLoggedIn && window.AuthManager.isLoggedIn()) ? window.AuthManager.getUser() : null;
            if(!user || !user.user_id){
                // show auth modal if not logged in
                const authModal = document.getElementById('authModal');
                if(authModal) authModal.style.display = 'block';
                return;
            }
            const API_URL = getApiUrl();
            const resp = await fetch(`${API_URL}/users/multiplier-breakdown/${user.user_id}`);
            if(!resp.ok) throw new Error('Failed to load breakdown');
            const json = await resp.json();
            const breakdown = json.breakdown;
            // Prefer canonical modal from ProfileRenderer when available
            if (window.showCur8MultiplierModal && typeof window.showCur8MultiplierModal === 'function') {
                try {
                    window.showCur8MultiplierModal(breakdown);
                    return;
                } catch (e) {
                    console.warn('showCur8MultiplierModal failed, falling back to nav modal:', e);
                }
            }
            createModal(breakdown);
        }catch(err){
            console.error('Failed opening multiplier modal from nav:', err);
        }
    }

    document.addEventListener('DOMContentLoaded', ()=>{
        const card = document.getElementById('multiplierCard');
        if(card) card.addEventListener('click', onClick);
    });
})();
