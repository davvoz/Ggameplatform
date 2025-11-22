# 🚀 Deploy Blocky Road to Production Server

## Server Info
- **Domain**: games.cur8.fun  
- **IP**: 95.216.27.123
- **Server**: Hetzner Ubuntu

---

## 📋 Steps to Deploy

### 1. Connect to Server via SSH

```bash
ssh root@95.216.27.123
```

### 2. Navigate to Project Directory

```bash
cd /opt/Ggameplatform
```

### 3. Pull Latest Changes from GitHub

```bash
git pull origin master
```

### 4. Rebuild and Restart Containers

```bash
docker-compose down
docker-compose up -d --build
```

### 5. Register Blocky Road Game

```bash
# Enter backend container
docker exec -it gameplatform_backend bash

# Navigate to scripts directory
cd scripts

# Run registration script
python register_blocky_road.py

# Exit container
exit
```

### 6. Verify Game is Live

Open in browser:
- **Game URL**: https://games.cur8.fun/#/play/blocky-road
- **API Check**: https://games.cur8.fun/games/

---

## 🎮 Expected Output

When you run `register_blocky_road.py`, you should see:

```
======================================================================
  🎮 BLOCKY ROAD - GAME REGISTRATION
======================================================================

✅ Game 'Blocky Road' registered successfully!

   Game ID:      blocky-road
   Title:        Blocky Road
   Category:     arcade
   Entry Point:  index.html
   Tags:         arcade, infinite-runner, blockchain, crossy-road, voxel, casual, mobile

🎯 Description:
   Cross the blockchain! Navigate through a procedurally generated world filled with crypto vehicles...

======================================================================
```

---

## 🔍 Troubleshooting

### If game already exists:
```
⚠️  Game 'Blocky Road' already exists in database
```
This is OK - the game is already registered!

### Check container logs:
```bash
docker-compose logs -f backend
```

### Check if game files exist:
```bash
docker exec gameplatform_backend ls -la /app/games/blocky-road/
```

### Restart containers if needed:
```bash
docker-compose restart
```

---

## ✅ Verification Checklist

- [ ] SSH connected to 95.216.27.123
- [ ] Git pull completed successfully
- [ ] Docker containers rebuilt
- [ ] Registration script executed
- [ ] Game accessible at https://games.cur8.fun/#/play/blocky-road
- [ ] Game appears in games list at https://games.cur8.fun/#/games
- [ ] Game controls working (Arrow keys / WASD)
- [ ] Score tracking functional
- [ ] Three.js graphics rendering correctly

---

## 📝 Quick Command Summary

```bash
# Full deployment (copy-paste all at once)
ssh root@95.216.27.123 << 'EOF'
cd /opt/Ggameplatform
git pull origin master
docker-compose down
docker-compose up -d --build
docker exec gameplatform_backend python scripts/register_blocky_road.py
echo "✅ Deployment complete! Check: https://games.cur8.fun/#/play/blocky-road"
EOF
```

---

## 🎯 Game Features

The deployed game includes:
- ✅ Three.js 3D voxel graphics
- ✅ Isometric camera view
- ✅ Player character with animations
- ✅ Cars on roads (variable speeds)
- ✅ Trains on rail tracks (fast)
- ✅ Floating logs on water
- ✅ Coin collection system
- ✅ Procedural terrain generation
- ✅ Collision detection
- ✅ Score tracking
- ✅ XP system integration

---

**Deployment Date**: 2025-11-22  
**Version**: 1.0.0  
**Game ID**: blocky-road
