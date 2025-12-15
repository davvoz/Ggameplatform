/**
 * Dice Face Reader
 * Reads which face is actually on top of a die based on its rotation
 */

export class DiceFaceReader {
  /**
   * Read which face number is currently on top (facing +Y)
   * @param {THREE.Mesh} die - The die mesh
   * @returns {number} The face number (1-6) currently on top
   */
  static readTopFace(die) {
    // Get world rotation matrix
    die.updateMatrixWorld();
    const matrix = die.matrixWorld;
    
    // Define the 6 face normals in local space
    // These correspond to where we placed the dots
    const faceNormals = {
      1: new THREE.Vector3(0, 0, 1),    // front (z+)
      2: new THREE.Vector3(1, 0, 0),    // right (x+)
      3: new THREE.Vector3(0, 1, 0),    // top (y+)
      4: new THREE.Vector3(0, -1, 0),   // bottom (y-)
      5: new THREE.Vector3(-1, 0, 0),   // left (x-)
      6: new THREE.Vector3(0, 0, -1)    // back (z-)
    };
    
    // Up direction in world space
    const upDirection = new THREE.Vector3(0, 1, 0);
    
    // Find which face normal is closest to pointing up
    let topFace = 1;
    let maxDot = -Infinity;
    
    for (let face = 1; face <= 6; face++) {
      // Transform the face normal to world space
      const worldNormal = faceNormals[face].clone();
      worldNormal.applyMatrix4(matrix);
      worldNormal.normalize();
      
      // Calculate dot product with up direction
      // The face with the highest dot product is facing up
      const dot = worldNormal.dot(upDirection);
      
      if (dot > maxDot) {
        maxDot = dot;
        topFace = face;
      }
    }
    
    return topFace;
  }
}
