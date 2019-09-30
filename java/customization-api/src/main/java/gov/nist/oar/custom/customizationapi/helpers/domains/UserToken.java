/**
 * This software was developed at the National Institute of Standards and Technology by employees of
 * the Federal Government in the course of their official duties. Pursuant to title 17 Section 105
 * of the United States Code this software is not subject to copyright protection and is in the
 * public domain. This is an experimental system. NIST assumes no responsibility whatsoever for its
 * use by other parties, and makes no guarantees, expressed or implied, about its quality,
 * reliability, or any other characteristic. We would appreciate acknowledgement if the software is
 * used. This software can be redistributed and/or modified freely provided that any derivative
 * works bear some notice that they are derived from it, and any modified versions bear some notice
 * that they have been modified.
 * @author: Deoyani Nandrekar-Heinis
 */
package gov.nist.oar.custom.customizationapi.helpers.domains;


import java.io.Serializable;
/**
 * This is to store user id and JWT information.
 * @author Deoyani Nandrekar-Heinis
 *
 */
public class UserToken implements Serializable {

    /**
     * 
     */
    private static final long serialVersionUID = -3414986086109823716L;
    private String token;
    private String userId;

    public UserToken(String userId, String token) {
        this.token = token;
        this.userId = userId;
    }

    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }
    
    public String getUserId() {
	return this.userId;
    }
    
    public void  setUserId(String userId) {
	this.userId = userId;
    }
}