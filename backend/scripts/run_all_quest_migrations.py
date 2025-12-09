#!/usr/bin/env python3
"""
MASTER MIGRATION SCRIPT - Quest System Setup
============================================

Questo script esegue tutte le migration necessarie per il sistema quest
nell'ordine corretto. Può essere lanciato sia in locale che su cloud.

Autore: Sistema Quest Tracking
Data: 2025-12-09
"""

import sys
import os
from datetime import datetime

# Aggiungi la directory parent al path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

def print_header(text):
    """Stampa un header formattato."""
    print("\n" + "=" * 70)
    print(f"  {text}")
    print("=" * 70)

def print_step(step_num, total_steps, description):
    """Stampa il numero dello step."""
    print(f"\n[{step_num}/{total_steps}] {description}")
    print("-" * 70)

def run_migration_step(module_name, function_name, description):
    """Esegue un singolo step di migration."""
    try:
        print(f"   ⏳ Esecuzione {module_name}.{function_name}()...")
        module = __import__(module_name)
        func = getattr(module, function_name)
        func()
        print(f"   ✅ Completato con successo!")
        return True
    except Exception as e:
        print(f"   ❌ ERRORE: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Esegue tutte le migration nell'ordine corretto."""
    
    start_time = datetime.now()
    
    print_header("QUEST SYSTEM - MASTER MIGRATION SCRIPT")
    print(f"\nData/Ora inizio: {start_time.strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Directory: {os.getcwd()}")
    
    # Lista degli step da eseguire
    migration_steps = [
        {
            'module': 'add_user_quest_extra_data',
            'function': 'add_extra_data_column',
            'description': 'Aggiunta colonna extra_data a user_quests'
        },
        {
            'module': 'add_login_streak_columns',
            'function': 'add_login_streak_columns',
            'description': 'Aggiunta colonne login_streak e last_login_date a users'
        },
        {
            'module': 'add_quest_config',
            'function': 'add_quest_config_column',
            'description': 'Aggiunta colonna config a quests'
        },
        {
            'module': 'update_score_threshold_quest',
            'function': 'update_score_threshold_quest',
            'description': 'Configurazione quest score_threshold_per_game'
        },
        {
            'module': 'update_quest_rewards',
            'function': 'update_quest_rewards',
            'description': 'Aggiornamento ricompense quest (coins)'
        }
    ]
    
    total_steps = len(migration_steps)
    successful_steps = 0
    failed_steps = []
    
    print_header("ESECUZIONE MIGRATION")
    
    # Esegui ogni step
    for idx, step in enumerate(migration_steps, 1):
        print_step(idx, total_steps, step['description'])
        
        success = run_migration_step(
            step['module'],
            step['function'],
            step['description']
        )
        
        if success:
            successful_steps += 1
        else:
            failed_steps.append(f"{idx}. {step['description']}")
    
    # Verifica finale
    print_header("VERIFICA FINALE")
    
    print("\n⏳ Esecuzione verifica sistema quest...")
    verify_success = run_migration_step(
        'verify_quest_system',
        'verify_quest_system',
        'Verifica configurazione sistema'
    )
    
    # Report finale
    end_time = datetime.now()
    duration = (end_time - start_time).total_seconds()
    
    print_header("REPORT FINALE")
    
    print(f"\n📊 Statistiche:")
    print(f"   • Step totali: {total_steps}")
    print(f"   • Step riusciti: {successful_steps}")
    print(f"   • Step falliti: {len(failed_steps)}")
    print(f"   • Durata: {duration:.2f} secondi")
    print(f"   • Data/Ora fine: {end_time.strftime('%Y-%m-%d %H:%M:%S')}")
    
    if failed_steps:
        print(f"\n❌ Step falliti:")
        for step in failed_steps:
            print(f"   • {step}")
        print(f"\n⚠️  ATTENZIONE: Alcune migration sono fallite!")
        print(f"   Controlla i log sopra per i dettagli.")
        return 1
    else:
        print(f"\n✅ Tutte le migration sono state eseguite con successo!")
        
        if verify_success:
            print(f"✅ Verifica finale completata con successo!")
            print(f"\n🎉 Il sistema quest è completamente configurato e pronto all'uso!")
        else:
            print(f"⚠️  La verifica finale ha rilevato alcuni problemi.")
            print(f"   Controlla i log sopra per i dettagli.")
            return 1
    
    print_header("MIGRATION COMPLETATA")
    

    
    return 0


if __name__ == "__main__":
    try:
        exit_code = main()
        sys.exit(exit_code)
    except KeyboardInterrupt:
        print("\n\n⚠️  Migration interrotta dall'utente!")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n❌ ERRORE CRITICO: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
